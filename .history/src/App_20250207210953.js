import React, { useState } from 'react';
import './App.css';

function App() {
  // Define initial apples with IDs, names, and initial Elo ratings.
  const initialApples = {
    A1: { name: 'Granny Smith', rating: 1500 },
    A2: { name: 'Fuji', rating: 1500 },
    A3: { name: 'Honeycrisp', rating: 1500 },
    A4: { name: 'Gala', rating: 1500 },
    A5: { name: 'Red Delicious', rating: 1500 },
    A6: { name: 'Pink Lady', rating: 1500 },
    A7: { name: 'Braeburn', rating: 1500 },
    A8: { name: 'Golden Delicious', rating: 1500 },
    A9: { name: 'Empire', rating: 1500 },
    A10: { name: 'Cortland', rating: 1500 },
    A11: { name: 'McIntosh', rating: 1500 },
    A12: { name: 'Ambrosia', rating: 1500 },
    A13: { name: 'Jazz', rating: 1500 },
    A14: { name: 'Envy', rating: 1500 },
    A15: { name: 'Crispin (Mutsu)', rating: 1500 },
  };

  // State to hold the apple ratings and selections.
  const [apples, setApples] = useState(initialApples);
  const [apple1, setApple1] = useState('A1');
  const [apple2, setApple2] = useState('A2');

  // Elo parameters
  const K = 32;

  // Calculate expected score for a matchup between two ratings.
  const expectedScore = (ratingA, ratingB) => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  };

  // Update ratings for a winner/loser pair.
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

  // Record the outcome of a comparison.
  const recordComparison = (winnerId) => {
    if (apple1 === apple2) {
      alert('Please select two different apples!');
      return;
    }
    const loserId = winnerId === apple1 ? apple2 : apple1;
    updateRatings(winnerId, loserId);
  };

  // Create a sorted leaderboard (highest rating first).
  const leaderboard = Object.entries(apples).sort(
    (a, b) => b[1].rating - a[1].rating
  );

  return (
    <div className="App" style={{ padding: '20px' }}>
      <h1>Apple Tasting Elo Experiment</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>
          Apple 1:
          <select
            value={apple1}
            onChange={(e) => setApple1(e.target.value)}
            style={{ marginLeft: '5px' }}
          >
            {Object.entries(apples).map(([id, data]) => (
              <option key={id} value={id}>
                {data.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Apple 2:
          <select
            value={apple2}
            onChange={(e) => setApple2(e.target.value)}
            style={{ marginLeft: '5px' }}
          >
            {Object.entries(apples).map(([id, data]) => (
              <option key={id} value={id}>
                {data.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => recordComparison(apple1)}>
          Select {apples[apple1].name} as Winner
        </button>
        <button
          onClick={() => recordComparison(apple2)}
          style={{ marginLeft: '20px' }}
        >
          Select {apples[apple2].name} as Winner
        </button>
      </div>

      <div>
        <h2>Leaderboard</h2>
        <table border="1" cellPadding="10">
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
    </div>
  );
}

export default App;