import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Keys for localStorage
  const STORAGE_KEYS = {
    APPLES: 'appleTastingApples',
    COMPARISONS: 'appleTastingComparisons',
    NEXT_APPLE_ID: 'appleTastingNextAppleId',
  };

  // Default apples: initially only Royal Gala and Pink Lady.
  const defaultApples = {
    A1: { name: 'Royal Gala', rating: 1500 },
    A2: { name: 'Pink Lady', rating: 1500 },
  };

  // Load initial state from localStorage, or use defaults.
  const loadApples = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPLES);
    return saved ? JSON.parse(saved) : defaultApples;
  };

  const loadComparisons = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMPARISONS);
    return saved ? JSON.parse(saved) : [];
  };

  const loadNextAppleId = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.NEXT_APPLE_ID);
    return saved ? Number(saved) : 3;
  };

  // States
  const [apples, setApples] = useState(loadApples);
  const [comparisons, setComparisons] = useState(loadComparisons);
  const [nextAppleId, setNextAppleId] = useState(loadNextAppleId);
  const [apple1, setApple1] = useState('A1');
  const [apple2, setApple2] = useState('A2');
  const [newAppleName, setNewAppleName] = useState('');

  // Elo parameters
  const K = 32;

  // Expected score function
  const expectedScore = (ratingA, ratingB) => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  };

  // This function recalculates all apple ratings from scratch by replaying
  // every battle in the comparisons history.
  const recalculateRatings = (currentComparisons, currentApples) => {
    // Reset every apple's rating to 1500.
    let newRatings = {};
    Object.keys(currentApples).forEach(id => {
      newRatings[id] = 1500;
    });

    // Replay each battle in the order they were recorded.
    currentComparisons.forEach(battle => {
      const { apple1Id, apple2Id, winnerId } = battle;
      const loserId = winnerId === apple1Id ? apple2Id : apple1Id;
      const ratingWinner = newRatings[winnerId];
      const ratingLoser = newRatings[loserId];
      const expWin = expectedScore(ratingWinner, ratingLoser);
      const expLoss = expectedScore(ratingLoser, ratingWinner);
      newRatings[winnerId] = ratingWinner + K * (1 - expWin);
      newRatings[loserId] = ratingLoser + K * (0 - expLoss);
    });

    // Update the apples state with recalculated ratings.
    setApples(prevApples => {
      const updated = { ...prevApples };
      Object.keys(updated).forEach(id => {
        updated[id].rating = newRatings[id];
      });
      return updated;
    });
  };

  // Record a new comparison (battle)
  const recordComparison = (winnerId) => {
    if (apple1 === apple2) {
      alert('Please select two different apples!');
      return;
    }
    const loserId = winnerId === apple1 ? apple2 : apple1;
    // Create the battle record.
    const today = new Date().toLocaleDateString();
    const newBattle = { date: today, apple1Id: apple1, apple2Id: apple2, winnerId: winnerId };
    // Update the comparisons state.
    const newComparisons = [...comparisons, newBattle];
    setComparisons(newComparisons);
    // Update the ratings by replaying all battles.
    recalculateRatings(newComparisons, apples);
  };

  // Add a new apple type.
  const addNewApple = (e) => {
    e.preventDefault();
    if (!newAppleName.trim()) {
      alert('Please enter a valid apple name.');
      return;
    }
    const newId = 'A' + nextAppleId;
    setApples(prev => ({
      ...prev,
      [newId]: { name: newAppleName.trim(), rating: 1500 },
    }));
    setNextAppleId(prev => prev + 1);
    setNewAppleName('');
  };

  // Delete a battle from history and recalc ratings.
  const deleteBattle = (index) => {
    const newComparisons = comparisons.filter((_, idx) => idx !== index);
    setComparisons(newComparisons);
    recalculateRatings(newComparisons, apples);
  };

  // Save to localStorage on changes.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPLES, JSON.stringify(apples));
  }, [apples]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPARISONS, JSON.stringify(comparisons));
  }, [comparisons]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NEXT_APPLE_ID, nextAppleId);
  }, [nextAppleId]);

  // Build a sorted leaderboard (highest rating first).
  const leaderboard = Object.entries(apples).sort(
    (a, b) => b[1].rating - a[1].rating
  );

  return (
    <div className="App">
      <header>
        <h1>Elo Experiment</h1>
      </header>

      <div className="main-content">
        <div className="tasting-panel">
          <h2>Apple Comparison</h2>
          <div className="dropdowns">
            <label>
              Apple 1:
              <select value={apple1} onChange={(e) => setApple1(e.target.value)}>
                {Object.entries(apples).map(([id, data]) => (
                  <option key={id} value={id}>
                    {data.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Apple 2:
              <select value={apple2} onChange={(e) => setApple2(e.target.value)}>
                {Object.entries(apples).map(([id, data]) => (
                  <option key={id} value={id}>
                    {data.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="buttons">
            <button onClick={() => recordComparison(apple1)}>
              Select {apples[apple1].name} as Winner
            </button>
            <button onClick={() => recordComparison(apple2)}>
              Select {apples[apple2].name} as Winner
            </button>
          </div>

          <div className="leaderboard">
            <h2>Leaderboard</h2>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Apple Name</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(([id, data], index) => (
                  <tr key={id}>
                    <td>{index + 1}</td>
                    <td>{data.name}</td>
                    <td>{data.rating.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="add-apple">
            <h2>Add New Apple</h2>
            <form onSubmit={addNewApple}>
              <input
                type="text"
                value={newAppleName}
                onChange={(e) => setNewAppleName(e.target.value)}
                placeholder="Enter apple name"
              />
              <button type="submit">Add Apple</button>
            </form>
          </div>
        </div>

        <aside className="history-panel">
          <h2>Historical Battles</h2>
          {comparisons.length === 0 ? (
            <p>No battles recorded yet.</p>
          ) : (
            <ul>
              {comparisons.map((battle, idx) => {
                const { date, apple1Id, apple2Id, winnerId } = battle;
                return (
                  <li key={idx}>
                    <strong>{date}:</strong> {apples[apple1Id].name} vs. {apples[apple2Id].name} – Winner: {apples[winnerId].name}
                    <button onClick={() => deleteBattle(idx)} style={{ marginLeft: '10px' }}>
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;