import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar as BarChart, Line as LineChart } from 'react-chartjs-2';
import { 
  Trophy, 
  Award, 
  Users, 
  User, 
  TrendingUp, 
  BarChart3, 
  Lightbulb, 
  Flame,
  Frown,
  Sparkles,
  Calendar,
  Activity
} from 'lucide-react';
import rawData from './data/wordle_scores.json';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Player color palette mappings
const playerColors = {
  Donald: {
    solid: '#00d2d3',
    glow: 'rgba(0, 210, 211, 0.2)',
    chartBg: 'rgba(0, 210, 211, 0.4)',
    chartBorder: '#00d2d3'
  },
  Steve: {
    solid: '#54a0ff',
    glow: 'rgba(84, 160, 255, 0.2)',
    chartBg: 'rgba(84, 160, 255, 0.4)',
    chartBorder: '#54a0ff'
  },
  Ian: {
    solid: '#a55eea',
    glow: 'rgba(165, 94, 234, 0.2)',
    chartBg: 'rgba(165, 94, 234, 0.4)',
    chartBorder: '#a55eea'
  },
  John: {
    solid: '#ff7675',
    glow: 'rgba(255, 118, 117, 0.2)',
    chartBg: 'rgba(255, 118, 117, 0.4)',
    chartBorder: '#ff7675'
  },
  Pete: {
    solid: '#ff9ff3',
    glow: 'rgba(255, 159, 243, 0.2)',
    chartBg: 'rgba(255, 159, 243, 0.4)',
    chartBorder: '#ff9ff3'
  },
  All: {
    solid: '#10b981',
    glow: 'rgba(16, 185, 129, 0.2)',
    chartBg: 'rgba(16, 185, 129, 0.4)',
    chartBorder: '#10b981'
  }
};

const playersList = ['All', 'Donald', 'Ian', 'John', 'Steve', 'Pete'];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function App() {
  const [selectedPlayer, setSelectedPlayer] = useState('All');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'seasonality'

  // Process data chronologically
  const sortedData = useMemo(() => {
    return [...rawData].sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  // Compute stats for all players
  const playerStats = useMemo(() => {
    const stats = {};
    playersList.forEach(p => {
      if (p === 'All') return;
      stats[p] = {
        total: 0,
        scores: [],
        xCount: 0,
        dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 },
        maxStreak: 0,
        currentStreak: 0
      };
    });

    sortedData.forEach(entry => {
      const p = entry.name;
      if (!stats[p]) return;
      stats[p].total += 1;
      const score = entry.score;
      if (score === 'X') {
        stats[p].xCount += 1;
        stats[p].dist['X'] += 1;
        stats[p].currentStreak = 0;
      } else {
        stats[p].scores.push(score);
        stats[p].dist[score] += 1;
        stats[p].currentStreak += 1;
        if (stats[p].currentStreak > stats[p].maxStreak) {
          stats[p].maxStreak = stats[p].currentStreak;
        }
      }
    });

    Object.keys(stats).forEach(p => {
      const pStats = stats[p];
      const sum = pStats.scores.reduce((a, b) => a + b, 0);
      pStats.avg = pStats.scores.length > 0 ? (sum / pStats.scores.length).toFixed(3) : '0.000';
      pStats.winRate = pStats.total > 0 ? (((pStats.total - pStats.xCount) / pStats.total) * 100).toFixed(1) : '0.0';
    });

    return stats;
  }, [sortedData]);

  // Aggregate stats based on active selection
  const activeStats = useMemo(() => {
    if (selectedPlayer !== 'All') {
      return playerStats[selectedPlayer];
    }

    const combined = {
      total: 0,
      scores: [],
      xCount: 0,
      dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 },
      maxStreak: Math.max(...Object.values(playerStats).map(p => p.maxStreak)),
      avg: '0.000',
      winRate: '0.0'
    };

    Object.values(playerStats).forEach(p => {
      combined.total += p.total;
      combined.scores.push(...p.scores);
      combined.xCount += p.xCount;
      for (let i = 1; i <= 6; i++) combined.dist[i] += p.dist[i];
      combined.dist['X'] += p.dist['X'];
    });

    const sum = combined.scores.reduce((a, b) => a + b, 0);
    combined.avg = combined.scores.length > 0 ? (sum / combined.scores.length).toFixed(3) : '0.000';
    combined.winRate = combined.total > 0 ? (((combined.total - combined.xCount) / combined.total) * 100).toFixed(1) : '0.0';

    return combined;
  }, [selectedPlayer, playerStats]);

  // Compute monthly trends for the line chart
  const monthlyTrends = useMemo(() => {
    const monthlyGroups = {};

    sortedData.forEach(entry => {
      const month = entry.date.substring(0, 7); // YYYY-MM
      const name = entry.name;
      const score = entry.score;
      if (score === 'X') return;

      if (!monthlyGroups[month]) {
        monthlyGroups[month] = {};
        playersList.forEach(p => { if (p !== 'All') monthlyGroups[month][p] = []; });
      }
      if (monthlyGroups[month][name]) {
        monthlyGroups[month][name].push(score);
      }
    });

    const months = Object.keys(monthlyGroups).sort();
    const monthLabels = months.map(m => {
      const [year, month] = m.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    const datasets = [];

    if (selectedPlayer === 'All') {
      Object.keys(playerColors).forEach(name => {
        if (name === 'All') return;
        const dataPoints = months.map(m => {
          const scores = monthlyGroups[m][name] || [];
          if (scores.length === 0) return null;
          const sum = scores.reduce((a, b) => a + b, 0);
          return parseFloat((sum / scores.length).toFixed(2));
        });

        datasets.push({
          label: name,
          data: dataPoints,
          borderColor: playerColors[name].solid,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          spanGaps: true
        });
      });
    } else {
      const playerPoints = months.map(m => {
        const scores = monthlyGroups[m][selectedPlayer] || [];
        if (scores.length === 0) return null;
        const sum = scores.reduce((a, b) => a + b, 0);
        return parseFloat((sum / scores.length).toFixed(2));
      });

      const groupAvgPoints = months.map(m => {
        let allScores = [];
        Object.keys(monthlyGroups[m]).forEach(name => {
          allScores.push(...monthlyGroups[m][name]);
        });
        if (allScores.length === 0) return null;
        const sum = allScores.reduce((a, b) => a + b, 0);
        return parseFloat((sum / allScores.length).toFixed(2));
      });

      datasets.push(
        {
          label: selectedPlayer,
          data: playerPoints,
          borderColor: playerColors[selectedPlayer].solid,
          backgroundColor: playerColors[selectedPlayer].glow,
          fill: true,
          borderWidth: 3,
          pointRadius: 4,
          tension: 0.3,
          spanGaps: true
        },
        {
          label: 'Group Average',
          data: groupAvgPoints,
          borderColor: 'rgba(255, 255, 255, 0.25)',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: true
        }
      );
    }

    return {
      labels: monthLabels,
      datasets
    };
  }, [selectedPlayer, sortedData]);

  // Compute distribution chart data
  const distChartData = useMemo(() => {
    const labels = ['1/6', '2/6', '3/6', '4/6', '5/6', '6/6', 'X/6'];
    const counts = [
      activeStats.dist[1],
      activeStats.dist[2],
      activeStats.dist[3],
      activeStats.dist[4],
      activeStats.dist[5],
      activeStats.dist[6],
      activeStats.dist['X']
    ];
    
    const percentages = counts.map(c => 
      activeStats.total > 0 ? parseFloat(((c / activeStats.total) * 100).toFixed(1)) : 0
    );

    const activeColor = playerColors[selectedPlayer];

    return {
      labels,
      datasets: [
        {
          label: 'Percentage (%)',
          data: percentages,
          backgroundColor: activeColor.chartBg,
          borderColor: activeColor.chartBorder,
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: activeColor.solid
        }
      ]
    };
  }, [selectedPlayer, activeStats]);

  // Advanced analysis: Autocorrelation & Seasonality Calculations
  const seasonalityStats = useMemo(() => {
    // 1. Group by month (YYYY-MM)
    const monthlyGroups = {};
    sortedData.forEach(entry => {
      const month = entry.date.substring(0, 7);
      const score = entry.score;
      if (score === 'X') return; // Skip failures

      if (selectedPlayer === 'All' || entry.name === selectedPlayer) {
        if (!monthlyGroups[month]) monthlyGroups[month] = [];
        monthlyGroups[month].push(score);
      }
    });

    const months = Object.keys(monthlyGroups).sort();
    
    // We need at least 5 games in a month to consider it valid
    const validMonths = months.filter(m => monthlyGroups[m].length >= 5);
    const series = validMonths.map(m => {
      const sum = monthlyGroups[m].reduce((a, b) => a + b, 0);
      return sum / monthlyGroups[m].length;
    });

    const N = series.length;
    let acf = [];
    let ci = 0;
    let seasonalAverages = Array(12).fill(0).map(() => ({ sum: 0, count: 0 }));

    if (N > 5) {
      // Calculate Mean and Variance
      const mean = series.reduce((a, b) => a + b, 0) / N;
      const variance = series.reduce((a, b) => a + (b - mean) ** 2, 0);

      // Autocorrelation coefficients for lags 1 to 12
      for (let lag = 1; lag <= 12; lag++) {
        if (lag >= N) break;
        let numerator = 0;
        for (let t = 0; t < N - lag; t++) {
          numerator += (series[t] - mean) * (series[t + lag] - mean);
        }
        const r_k = variance > 0 ? numerator / variance : 0;
        acf.push(r_k);
      }
      ci = 2 / Math.sqrt(N);
    }

    // 2. Group by Month of Year (0 to 11)
    sortedData.forEach(entry => {
      const score = entry.score;
      if (score === 'X') return;

      if (selectedPlayer === 'All' || entry.name === selectedPlayer) {
        const monthIndex = parseInt(entry.date.substring(5, 7)) - 1; // 0-indexed month
        seasonalAverages[monthIndex].sum += score;
        seasonalAverages[monthIndex].count += 1;
      }
    });

    const formattedSeasonal = seasonalAverages.map((val, idx) => ({
      month: monthNames[idx],
      avg: val.count > 0 ? parseFloat((val.sum / val.count).toFixed(3)) : 0
    }));

    return {
      acf,
      ci,
      seasonalAverages: formattedSeasonal,
      numMonths: N
    };
  }, [selectedPlayer, sortedData]);

  // Autocorrelation chart data
  const acfChartData = useMemo(() => {
    const labels = Array.from({ length: seasonalityStats.acf.length }, (_, i) => `Lag ${i + 1}`);
    const activeColor = playerColors[selectedPlayer];

    return {
      labels,
      datasets: [
        {
          label: 'Autocorrelation (r_k)',
          data: seasonalityStats.acf,
          backgroundColor: seasonalityStats.acf.map(val => 
            Math.abs(val) > seasonalityStats.ci ? 'rgba(239, 68, 68, 0.6)' : activeColor.chartBg
          ),
          borderColor: seasonalityStats.acf.map(val => 
            Math.abs(val) > seasonalityStats.ci ? '#ef4444' : activeColor.chartBorder
          ),
          borderWidth: 2,
          borderRadius: 4
        },
        // 95% Confidence interval boundaries
        {
          label: '95% CI Upper',
          data: Array(seasonalityStats.acf.length).fill(seasonalityStats.ci),
          borderColor: 'rgba(255, 255, 255, 0.25)',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1.5,
          type: 'line',
          fill: false
        },
        {
          label: '95% CI Lower',
          data: Array(seasonalityStats.acf.length).fill(-seasonalityStats.ci),
          borderColor: 'rgba(255, 255, 255, 0.25)',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1.5,
          type: 'line',
          fill: false
        }
      ]
    };
  }, [selectedPlayer, seasonalityStats]);

  // Seasonal averages chart data
  const seasonalChartData = useMemo(() => {
    const labels = seasonalityStats.seasonalAverages.map(d => d.month.substring(0, 3));
    const dataPoints = seasonalityStats.seasonalAverages.map(d => d.avg);
    const activeColor = playerColors[selectedPlayer];

    // Find min and max to draw visual markers
    const nonZero = dataPoints.filter(v => v > 0);
    const minVal = Math.min(...nonZero);
    const maxVal = Math.max(...nonZero);

    return {
      labels,
      datasets: [
        {
          label: 'Average Score',
          data: dataPoints,
          backgroundColor: dataPoints.map(val => {
            if (val === maxVal) return 'rgba(239, 68, 68, 0.6)'; // Worst month: red
            if (val === minVal) return 'rgba(16, 185, 129, 0.6)'; // Best month: green
            return activeColor.chartBg;
          }),
          borderColor: dataPoints.map(val => {
            if (val === maxVal) return '#ef4444';
            if (val === minVal) return '#10b981';
            return activeColor.chartBorder;
          }),
          borderWidth: 2,
          borderRadius: 6
        }
      ]
    };
  }, [selectedPlayer, seasonalityStats]);

  // Chart options configurations
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.raw}% (${countsForSelection[context.dataIndex]} games)`
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af', callback: (value) => `${value}%` }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { weight: 'bold' } }
      }
    }
  };

  const countsForSelection = useMemo(() => {
    return [
      activeStats.dist[1],
      activeStats.dist[2],
      activeStats.dist[3],
      activeStats.dist[4],
      activeStats.dist[5],
      activeStats.dist[6],
      activeStats.dist['X']
    ];
  }, [activeStats]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#e5e7eb', font: { family: 'Outfit' } }
      },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af' },
        title: {
          display: true,
          text: 'Average Score (Lower is better)',
          color: '#9ca3af'
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  const acfOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.datasetIndex === 0) {
              const val = context.raw;
              const isSig = Math.abs(val) > seasonalityStats.ci ? ' (Significant)' : '';
              return ` ACF: ${val.toFixed(3)}${isSig}`;
            }
            return null;
          }
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af' },
        min: -0.6,
        max: 0.6,
        title: { display: true, text: 'Autocorrelation (r_k)', color: '#9ca3af' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  const seasonalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Average: ${context.raw.toFixed(3)}`
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af' },
        min: 3.5, // Zoom in to highlight differences
        max: 4.2,
        title: { display: true, text: 'Average Score', color: '#9ca3af' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header Panel */}
      <header className="dashboard-header glass-panel">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Trophy color="#f59e0b" size={28} />
            <h1 className="title-gradient" style={{ fontSize: '2.25rem' }}>Fawcett Wordlers</h1>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
            Exploring 4 Years of Wordle Scores (June 2022 – May 2026)
          </p>
        </div>

        {/* Player filter buttons */}
        <div className="player-selector">
          {playersList.map(player => {
            const isActive = selectedPlayer === player;
            const style = isActive ? {
              '--active-bg': playerColors[player].glow,
              '--active-border': playerColors[player].solid,
              '--active-shadow': playerColors[player].glow,
              borderColor: playerColors[player].solid,
              background: playerColors[player].glow,
              color: '#fff'
            } : {};

            return (
              <button
                key={player}
                className={`player-btn ${isActive ? 'active' : ''}`}
                style={style}
                onClick={() => setSelectedPlayer(player)}
              >
                <span 
                  className="player-dot" 
                  style={{ '--player-color': playerColors[player].solid }}
                />
                {player === 'All' ? 'Group View' : player}
              </button>
            );
          })}
        </div>
      </header>

      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
        <button
          className={`player-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          style={activeTab === 'dashboard' ? {
            '--active-bg': 'rgba(16, 185, 129, 0.15)',
            '--active-border': '#10b981',
            '--active-shadow': 'rgba(16, 185, 129, 0.1)',
            borderColor: '#10b981',
            color: '#fff'
          } : {}}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={16} />
          Stats Dashboard
        </button>
        <button
          className={`player-btn ${activeTab === 'seasonality' ? 'active' : ''}`}
          style={activeTab === 'seasonality' ? {
            '--active-bg': 'rgba(165, 94, 234, 0.15)',
            '--active-border': '#a55eea',
            '--active-shadow': 'rgba(165, 94, 234, 0.1)',
            borderColor: '#a55eea',
            color: '#fff'
          } : {}}
          onClick={() => setActiveTab('seasonality')}
        >
          <Calendar size={16} />
          Seasonality & Correlation
        </button>
      </div>

      {/* CONDITIONAL TAB RENDERING */}
      {activeTab === 'dashboard' ? (
        <>
          {/* Stats Cards Row */}
          <section className="stats-grid">
            <div className="glass-panel stat-card" style={{ '--player-color': playerColors[selectedPlayer].solid }}>
              <div className="stat-label">Games Tracked</div>
              <div className="stat-value">{activeStats.total}</div>
              <div className="stat-desc">Total Wordle scores shared</div>
            </div>

            <div className="glass-panel stat-card" style={{ '--player-color': playerColors[selectedPlayer].solid }}>
              <div className="stat-label">Average Score</div>
              <div className="stat-value">{activeStats.avg}</div>
              <div className="stat-desc">Lower score is better (excl. X)</div>
            </div>

            <div className="glass-panel stat-card" style={{ '--player-color': playerColors[selectedPlayer].solid }}>
              <div className="stat-label">Success Rate</div>
              <div className="stat-value">
                {activeStats.winRate}<span className="sub">%</span>
              </div>
              <div className="stat-desc">Percentage of puzzles completed (&lt; 6 tries)</div>
            </div>

            <div className="glass-panel stat-card" style={{ '--player-color': playerColors[selectedPlayer].solid }}>
              <div className="stat-label">Best Win Streak</div>
              <div className="stat-value">{activeStats.maxStreak}</div>
              <div className="stat-desc">Highest consecutive wins without failing (X)</div>
            </div>
          </section>

          {/* Charts Grid */}
          <section className="main-grid">
            {/* Score Distribution Chart */}
            <div className="glass-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <BarChart3 size={20} color="var(--accent-green)" />
                  Score Distribution
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedPlayer === 'All' ? 'Group Combined' : `${selectedPlayer}'s Spread`}
                </span>
              </div>
              <div className="chart-container">
                <BarChart data={distChartData} options={barOptions} />
              </div>
            </div>

            {/* Timeline Chart */}
            <div className="glass-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <TrendingUp size={20} color="#a55eea" />
                  Cognitive Decline Tracker
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Monthly Average Scores
                </span>
              </div>
              <div className="chart-container">
                <LineChart data={monthlyTrends} options={lineOptions} />
              </div>
            </div>

            {/* Head-to-Head Comparison Table */}
            <div className="glass-panel full-width-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <Users size={20} color="#ff7675" />
                  Head-to-Head Stats
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Cumulative player records compared
                </span>
              </div>
              
              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Total Games</th>
                      <th>Average Score</th>
                      <th>Success Rate</th>
                      <th>Failures (X)</th>
                      <th>Best Win Streak</th>
                      <th>1s / 2s / 3s</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(playerStats).map(([name, stats]) => (
                      <tr 
                        key={name}
                        style={selectedPlayer === name ? { background: 'rgba(255, 255, 255, 0.03)' } : {}}
                      >
                        <td>
                          <span className="player-row-name">
                            <span 
                              className="player-dot" 
                              style={{ '--player-color': playerColors[name].solid, width: '10px', height: '10px' }}
                            />
                            {name}
                          </span>
                        </td>
                        <td>{stats.total}</td>
                        <td style={{ fontWeight: 'bold' }}>{stats.avg}</td>
                        <td>{stats.winRate}%</td>
                        <td style={{ color: stats.xCount > 25 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                          {stats.xCount}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Flame size={14} color="#f59e0b" fill="#f59e0b" />
                            {stats.maxStreak}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {stats.dist[1]} / {stats.dist[2]} / {stats.dist[3]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trivia & Anomalies */}
            <div className="glass-panel full-width-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <Lightbulb size={20} color="#f59e0b" />
                  Chat Anomalies & Fun Facts
                </h3>
              </div>
              
              <div className="trivia-list">
                <div className="trivia-item">
                  <div className="trivia-icon">
                    <Sparkles size={20} />
                  </div>
                  <div className="trivia-content">
                    <span className="trivia-title">Pete's Immediate Wordle "Corrections"</span>
                    <span className="trivia-desc">
                      On both <strong>Sept 29 & 30, 2024</strong>, Pete posted an <strong>X/6</strong> score (failure) and then posted a <strong>3/6</strong> score with grid details exactly one minute later. Steve Macaulay called him out on it (Steve: <em>"?"</em> & Pete: <em>"Just one of those things"</em>).
                    </span>
                  </div>
                </div>

                <div className="trivia-item">
                  <div className="trivia-icon" style={{ background: 'rgba(0, 210, 211, 0.15)', color: '#00d2d3' }}>
                    <Trophy size={20} />
                  </div>
                  <div className="trivia-content">
                    <span className="trivia-title">Group Champion: Donald Forrester</span>
                    <span className="trivia-desc">
                      Donald is currently leading the group with the lowest average score of <strong>3.865</strong> across 1,410 tracked games, closely followed by Ian (3.894) and John (3.902).
                    </span>
                  </div>
                </div>

                <div className="trivia-item">
                  <div className="trivia-icon" style={{ background: 'rgba(255, 118, 117, 0.15)', color: '#ff7675' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div className="trivia-content">
                    <span className="trivia-title">John King's "Cognitive Decline Tracker"</span>
                    <span className="trivia-desc">
                      Early in the chat (July 2022), John joked: <em>"This is a great way to chart our cognitive decline. I bet they are predictive of e.g. dementia onset."</em> The timeline chart validates this: players' averages have remained remarkably stable around 3.8 to 4.0, showing no massive upwards trends over the 4 years!
                    </span>
                  </div>
                </div>

                <div className="trivia-item">
                  <div className="trivia-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                    <Frown size={20} />
                  </div>
                  <div className="trivia-content">
                    <span className="trivia-title">Toughest Puzzle Performance (X/6)</span>
                    <span className="trivia-desc">
                      John has failed the most puzzles, recording <strong>33 failures (X/6)</strong>. However, Pete has the highest failure <em>rate</em> at <strong>3.7%</strong> (19 failures across only 510 games).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Seasonality & Advanced Stats view */
        <section className="main-grid">
          {/* Month of Year Averages */}
          <div className="glass-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <Calendar size={20} color="var(--accent-gold)" />
                Monthly Seasonality averages (All Years)
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {selectedPlayer === 'All' ? 'Group Averages' : `${selectedPlayer}'s Averages`}
              </span>
            </div>
            <div className="chart-container">
              <BarChart data={seasonalChartData} options={seasonalOptions} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', gap: '1rem' }}>
              <div><span style={{ color: '#10b981', fontWeight: 'bold' }}>■</span> Green: Best Performance</div>
              <div><span style={{ color: '#ef4444', fontWeight: 'bold' }}>■</span> Red: Worst Performance</div>
            </div>
          </div>

          {/* Autocorrelation (ACF) */}
          <div className="glass-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <Activity size={20} color="#a55eea" />
                Autocorrelation Function (ACF)
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Lags 1 – 12 (Monthly Series)
              </span>
            </div>
            <div className="chart-container">
              <BarChart data={acfChartData} options={acfOptions} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Dashed line represents 95% Confidence Interval limit (±{(seasonalityStats.ci).toFixed(3)}).
            </div>
          </div>

          {/* Statistical Breakdown Analysis Card */}
          <div className="glass-panel full-width-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <Lightbulb size={20} color="#10b981" />
                Statistical Interpretation & Insights
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>●</span> The "Summer Slump" (Seasonal Effect)
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Analyzing the aggregate data reveals a clear and consistent seasonal trend. Group performance peaks in the winter months, with **February** yielding the best average score of **3.822**, followed closely by **January (3.827)** and **December (3.838)**. 
                  Conversely, performance drops significantly in the summer, bottoming out in **July** with an average score of **4.044**.
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <em>Hypothesis:</em> Winter provides more indoor focus and morning routine consistency. Summer months bring travel, holidays, and disrupted schedules, leading to faster or less calculated guesses.
                </p>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#a55eea' }}>●</span> Autocorrelation Analysis (Time-Series Memory)
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Autocorrelation (ACF) measures how strongly a month's performance correlates with its own past values at various lags (month offsets). 
                  For {selectedPlayer === 'All' ? 'the group as a whole' : selectedPlayer}, <strong>no autocorrelation coefficients are statistically significant</strong> (none cross the 95% confidence interval boundaries represented by the dashed lines).
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>
                  * **Lag 1 (Month-to-month):** Indicates how much last month's score predicts this month. The value is low (~0.15), suggesting very little "momentum" or carryover.
                  * **Lag 12 (Year-to-year seasonality):** Measures if the same month in consecutive years correlates. The value is close to zero, showing that overall yearly cycles do not exhibit repeating patterns when trended chronologically.
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <em>Statistical Conclusion:</em> The Wordle scores behave mostly like a stationary series with random monthly variance. There is no long-term statistical "memory" in performance, indicating players start fresh each month.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
