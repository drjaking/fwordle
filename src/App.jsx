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
import { Bar, Line } from 'react-chartjs-2';
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
  Sparkles
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

export default function App() {
  const [selectedPlayer, setSelectedPlayer] = useState('All');

  // Process data chronologically
  const sortedData = useMemo(() => {
    return [...rawData].sort((a, b) => new RegExp(a.date).test(b.date) ? 0 : a.date.localeCompare(b.date));
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

    // We also want to compute streaks. Let's group scores by player and date
    // Sort dates first to make streak calculations correct
    sortedData.forEach(entry => {
      const p = entry.name;
      if (!stats[p]) return;
      stats[p].total += 1;
      const score = entry.score;
      if (score === 'X') {
        stats[p].xCount += 1;
        stats[p].dist['X'] += 1;
        stats[p].currentStreak = 0; // Fail breaks streak
      } else {
        stats[p].scores.push(score);
        stats[p].dist[score] += 1;
        stats[p].currentStreak += 1;
        if (stats[p].currentStreak > stats[p].maxStreak) {
          stats[p].maxStreak = stats[p].currentStreak;
        }
      }
    });

    // Calculate averages and success rates
    Object.keys(stats).forEach(p => {
      const pStats = stats[p];
      const sum = pStats.scores.reduce((a, b) => a + b, 0);
      pStats.avg = pStats.scores.length > 0 ? (sum / pStats.scores.length).toFixed(3) : '0.000';
      pStats.winRate = pStats.total > 0 ? (( (pStats.total - pStats.xCount) / pStats.total ) * 100).toFixed(1) : '0.0';
    });

    return stats;
  }, [sortedData]);

  // Aggregate stats based on active selection
  const activeStats = useMemo(() => {
    if (selectedPlayer !== 'All') {
      return playerStats[selectedPlayer];
    }

    // Combine stats for 'All'
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

  // Compute monthly trends for the line chart (John's Cognitive Decline tracker!)
  const monthlyTrends = useMemo(() => {
    // Group scores by YYYY-MM
    const monthlyGroups = {}; // { '2022-06': { Donald: [], Steve: [], ... } }

    sortedData.forEach(entry => {
      const month = entry.date.substring(0, 7); // 'YYYY-MM'
      const name = entry.name;
      const score = entry.score;
      if (score === 'X') return; // Skip fails for average tracking

      if (!monthlyGroups[month]) {
        monthlyGroups[month] = {};
        playersList.forEach(p => { if (p !== 'All') monthlyGroups[month][p] = []; });
      }
      if (monthlyGroups[month][name]) {
        monthlyGroups[month][name].push(score);
      }
    });

    // Get sorted list of months
    const months = Object.keys(monthlyGroups).sort();
    
    // Format labels: 'YYYY-MM' -> 'Jan 23'
    const monthLabels = months.map(m => {
      const [year, month] = m.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    const datasets = [];

    if (selectedPlayer === 'All') {
      // Plot lines for all players
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
          pointHoverRadius: 6,
          tension: 0.3,
          spanGaps: true
        });
      });
    } else {
      // Plot single line for selected player + group average comparison line
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
    
    // Percentage distribution
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

  // Chart configuration options
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
        // Lower averages are better in Wordle
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

  return (
    <div className="animate-fade-in">
      {/* Header Panel */}
      <header className="dashboard-header glass-panel">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

      {/* Stats Cards Row */}
      <section className="stats-grid">
        <div className="glass-panel stat-card" style={{ '--player-color': playerColors[selectedPlayer].solid }}>
          <div className="stat-label">Games Tracked</div>
          <div className="stat-value">
            {activeStats.total}
          </div>
          <div className="stat-desc">Total Wordle scores shared</div>
        </div>

        <div className="glass-panel stat-card" style={{ '--player-color': playerColors[selectedPlayer].solid }}>
          <div className="stat-label">Average Score</div>
          <div className="stat-value">
            {activeStats.avg}
          </div>
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
          <div className="stat-value">
            {activeStats.maxStreak}
          </div>
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
            <Bar data={distChartData} options={barOptions} />
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
            <Line data={monthlyTrends} options={lineOptions} />
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

        {/* Trivia, Insights & Anomalies */}
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
    </div>
  );
}
