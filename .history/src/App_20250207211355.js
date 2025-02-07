import React, { useState } from 'react';
import './App.css';

function App() {
  // Initial apples: only Royal Gala and Pink Lady.
  const initialApples = {
    A1: { name: 'Royal Gala', rating: 1500 },
    A2: { name: 'Pink Lady', rating: 1500 },
  };

  // State for apples, comparisons, and tracking next apple id.
  const [apples, setApples] = useState(initialApples);
  const [comparisons, setComparisons] = useState([]); // Each entry: { date, apple1Id, apple2Id, winnerId }
  const [nextAppleId, setNextAppleId] = useState(3);

  // State for dropdown selections.
  const [apple1, setApple1] = useState('A1');
  const [apple2, setApple2] = useState('A2');

  // State for new apple form.
  const [newAppleName, setNewAppleName] = useState('');

  // Elo parameters.
  const K = 32;

  // Calculate expected score for two ratings.
  const expectedScore = (ratingA, ratingB) => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  };

  // Update ratings for the winner and loser.
  const updateRatings = (winnerId, loserId) => {
    setApples(prevApples => {
      const ratingWinner = prevApples[winnerId].rating;
      const ratingLoser = prevApples[loserId].rating;

      const expWin = expectedScore(ratingWinner, ratingLoser);
      const expLoss = expectedScore(ratingLoser, ratingWinner);

      const newRatingWinner = ratingWinner + K * (1 - expWin);
      const newRatingLoser = ratingLoser + K * (0 - expLoss);

      return {
        ...prevApples,
        [winnerId]: { ...prevApples[winnerId], rating: newRatingWinner },
        [loserId]: { ...prevApples[loserId], rating: newRatingLoser },
      };
    });
  };

  // Record a comparison (battle) result.
  const recordComparison = (winnerId) => {
    if (apple1 === apple2) {
      alert('Please select two different apples!');
      return;
    }
    const loserId = winnerId === apple1 ? apple2 : apple1;
    // Update Elo ratings.
    updateRatings(winnerId, loserId);
    // Record the battle.
    const today = new Date().toLocaleDateString();
    setComparisons(prev => [
      ...prev,
      { date: today, apple1Id: apple1, apple2Id: apple2, winnerId: winnerId },
    ]);
  };

  // Add a new apple type to the list.
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

  // Create a sorted leaderboard (highest rating first).
  const leaderboard = Object.entries(apples).sort(
    (a, b) => b[1].rating - a[1].rating
  );

  return (
    <div className="App">
      <header>
        <h1>Apple Tasting Elo Experiment</h1>
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
                    <strong>{date}:</strong> {apples[apple1Id].name} vs. {apples[apple2Id].name} – Winner:{' '}
                    {apples[winnerId].name}
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