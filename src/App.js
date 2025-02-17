import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // LocalStorage key for all arenas.
  const STORAGE_KEY = 'pairwiseRankingArenas';

  // Default arena with two items.
  const defaultArenas = {
    apples: {
      displayName: 'Apple Battle Arena',
      items: {
        A1: { name: 'Royal Gala', cost: 1.50, elo: 1500, glicko: 1500, RD: 350, volatility: 0.06 },
        A2: { name: 'Pink Lady', cost: 4.50, elo: 1500, glicko: 1500, RD: 350, volatility: 0.06 },
      },
      comparisons: [],
      nextItemId: 3,
    },
  };

  // --- Helper to load arenas ---
  const loadArenas = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultArenas;
  };

  // State declarations
  const [arenas, setArenas] = useState(loadArenas);
  const [selectedArena, setSelectedArena] = useState('apples');
  const [item1, setItem1] = useState('A1');
  const [item2, setItem2] = useState('A2');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newArenaName, setNewArenaName] = useState('');
  const [showNewArenaInput, setShowNewArenaInput] = useState(false);
  const [sortBy, setSortBy] = useState('elo'); // "name", "elo", "glicko", "cost", or "adjusted"
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingArenaKey, setEditingArenaKey] = useState(null);
  const [editingArenaName, setEditingArenaName] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemCost, setEditingItemCost] = useState(null);

  const K = 32;
  const currentArena = arenas[selectedArena];

  // --- Function Definitions ---

  // Elo expected score function.
  const expectedScore = (ratingA, ratingB) => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  };

  // Glicko‑2 helper functions.
  const convertToGlickoScale = (rating, RD) => {
    const r = (rating - 1500) / 173.7178;
    const RD2 = RD / 173.7178;
    return { r, RD: RD2 };
  };

  const g = (RD) => {
    return 1 / Math.sqrt(1 + (3 * RD * RD) / (Math.PI * Math.PI));
  };

  const E = (r, rj, RDj) => {
    return 1 / (1 + Math.exp(-g(RDj) * (r - rj)));
  };

  const updateGlicko = (item, matches) => {
    if (matches.length === 0) {
      return { rating: 1500, RD: 350, volatility: 0.06 };
    }
    const { r, RD } = convertToGlickoScale(item.glicko, item.RD);
    const vol = item.volatility ?? 0.06;
    let sum = 0;
    matches.forEach(match => {
      const { opponent } = match;
      const { r: rj, RD: RDj } = convertToGlickoScale(opponent.glicko, opponent.RD);
      const E_val = E(r, rj, RDj);
      sum += Math.pow(g(RDj), 2) * E_val * (1 - E_val);
    });
    if (sum === 0) { sum = 0.000001; }
    const v = 1 / sum;
    let deltaSum = 0;
    matches.forEach(match => {
      const { opponent, s } = match;
      const { r: rj, RD: RDj } = convertToGlickoScale(opponent.glicko, opponent.RD);
      const E_val = E(r, rj, RDj);
      deltaSum += g(RDj) * (s - E_val);
    });
    const delta = v * deltaSum;
    const r_new = r + (Math.pow(RD, 2) * delta) / (Math.pow(RD, 2) + v);
    const RD_new = Math.sqrt(1 / ((1 / (RD * RD)) + (1 / v)));
    const new_rating = r_new * 173.7178 + 1500;
    const new_RD = RD_new * 173.7178;
    if (isNaN(new_rating) || isNaN(new_RD)) {
      return { rating: 1500, RD: 350, volatility: vol };
    }
    return { rating: new_rating, RD: new_RD, volatility: vol };
  };

  const recalcRatings = (battleHistory, items) => {
    let newItems = {};
    Object.keys(items).forEach(id => {
      newItems[id] = {
        ...items[id],
        elo: 1500,
        glicko: 1500,
        RD: 350,
        volatility: 0.06,
      };
    });
    battleHistory.forEach(battle => {
      const { item1Id, item2Id, winnerId } = battle;
      const loserId = winnerId === item1Id ? item2Id : item1Id;
      const ratingWinner = newItems[winnerId].elo;
      const ratingLoser = newItems[loserId].elo;
      const expWin = expectedScore(ratingWinner, ratingLoser);
      newItems[winnerId].elo = ratingWinner + K * (1 - expWin);
      newItems[loserId].elo = ratingLoser + K * (0 - (1 - expWin));
      let tempHistory = battleHistory.slice(0, battleHistory.indexOf(battle) + 1);
      Object.keys(newItems).forEach(id => {
        let matches = [];
        tempHistory.forEach(b => {
          if (b.item1Id === id || b.item2Id === id) {
            const opponentId = b.item1Id === id ? b.item2Id : b.item1Id;
            const s = b.winnerId === id ? 1 : 0;
            matches.push({ opponent: newItems[opponentId], s });
          }
        });
        const updated = updateGlicko(newItems[id], matches);
        newItems[id].glicko = updated.rating;
        newItems[id].RD = updated.RD;
        newItems[id].volatility = updated.volatility;
      });
    });
    return newItems;
  };

  const recordComparison = (winnerId) => {
    if (!currentArena.items[item1] || !currentArena.items[item2]) {
      alert('Not enough items to record a battle.');
      return;
    }
    if (item1 === item2) {
      alert('Please select two different items!');
      return;
    }
    const loserId = winnerId === item1 ? item2 : item1;
    const today = new Date().toLocaleDateString();
    const newBattle = { date: today, item1Id: item1, item2Id: item2, winnerId: winnerId };
    const newComparisons = [...currentArena.comparisons, newBattle];
    const updatedItems = recalcRatings(newComparisons, currentArena.items);
    const updatedArena = { ...currentArena, comparisons: newComparisons, items: updatedItems };
    setArenas(prev => ({
      ...prev,
      [selectedArena]: updatedArena,
    }));
  };

  const addNewItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCost.trim()) {
      alert('Please enter a valid item name and cost.');
      return;
    }
    const costValue = parseFloat(newItemCost);
    if (isNaN(costValue) || costValue <= 0) {
      alert('Cost must be a positive number.');
      return;
    }
    const newId = 'A' + currentArena.nextItemId;
    const newItem = {
      name: newItemName.trim(),
      cost: costValue,
      elo: 1500,
      glicko: 1500,
      RD: 350,
      volatility: 0.06,
    };
    const updatedArena = {
      ...currentArena,
      items: {
        ...currentArena.items,
        [newId]: newItem,
      },
      nextItemId: currentArena.nextItemId + 1,
    };
    setArenas(prev => ({
      ...prev,
      [selectedArena]: updatedArena,
    }));
    setNewItemName('');
    setNewItemCost('');
  };

  const deleteBattle = (index) => {
    const newComparisons = currentArena.comparisons.filter((_, idx) => idx !== index);
    const updatedItems = recalcRatings(newComparisons, currentArena.items);
    const updatedArena = { ...currentArena, comparisons: newComparisons, items: updatedItems };
    setArenas(prev => ({
      ...prev,
      [selectedArena]: updatedArena,
    }));
  };

  const addNewArena = (e) => {
    e.preventDefault();
    if (!newArenaName.trim()) {
      alert('Please enter a valid arena name.');
      return;
    }
    const key = newArenaName.trim().toLowerCase().replace(/\s+/g, '-');
    if (arenas[key]) {
      alert('An arena with that name already exists.');
      return;
    }
    const newArena = {
      displayName: newArenaName.trim(),
      items: {},
      comparisons: [],
      nextItemId: 1,
    };
    setArenas(prev => ({
      ...prev,
      [key]: newArena,
    }));
    setNewArenaName('');
    setShowNewArenaInput(false);
    setSelectedArena(key);
  };

  const deleteItem = (itemId) => {
    const { [itemId]: deleted, ...remainingItems } = currentArena.items;
    const remainingBattles = currentArena.comparisons.filter(
      battle => battle.item1Id !== itemId && battle.item2Id !== itemId
    );
    const updatedItems = recalcRatings(remainingBattles, remainingItems);
    const updatedArena = { 
      ...currentArena, 
      comparisons: remainingBattles, 
      items: updatedItems 
    };
    setArenas(prev => ({
      ...prev,
      [selectedArena]: updatedArena,
    }));
  };

  // --- Normalizing Cost ---
  const computeCostRange = (items) => {
    const costs = Object.values(items)
      .map(item => item.cost)
      .filter(cost => typeof cost === 'number' && cost > 0);
    if (costs.length === 0) return { minCost: 0, maxCost: 0 };
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    return { minCost, maxCost };
  };

  const getNormalizedCost = (item, items) => {
    const { minCost, maxCost } = computeCostRange(items);
    if (maxCost === minCost) return 1;
    return (item.cost - minCost) / (maxCost - minCost) + 1;
  };

  // --- Normalizing Glicko ---
  const computeGlickoRange = (items) => {
    const glickos = Object.values(items)
      .map(item => item.glicko)
      .filter(g => typeof g === 'number');
    if (glickos.length === 0) return { minGlicko: 1500, maxGlicko: 1500 };
    const minGlicko = Math.min(...glickos);
    const maxGlicko = Math.max(...glickos);
    return { minGlicko, maxGlicko };
  };

  const getNormalizedGlicko = (item, items) => {
    const { minGlicko, maxGlicko } = computeGlickoRange(items);
    if (maxGlicko === minGlicko) return 1;
    return (item.glicko - minGlicko) / (maxGlicko - minGlicko) + 1;
  };

  // --- Adjusted Score Calculation ---
  // Adjusted Score = (Normalized Glicko) / (Normalized Cost)
  const getAdjustedScore = (item, items) => {
    if (typeof item.cost === 'number' && item.cost > 0 && typeof item.glicko === 'number') {
      const normGlicko = getNormalizedGlicko(item, items);
      const normCost = getNormalizedCost(item, items);
      return normGlicko / normCost;
    }
    return 0;
  };

  // --- Sorting: Handle Header Click ---
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // --- Sorted Leaderboard ---
  const sortedLeaderboard = currentArena
    ? Object.entries(currentArena.items).sort(([, aData], [, bData]) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'name':
            aVal = aData.name.toLowerCase();
            bVal = bData.name.toLowerCase();
            break;
          case 'elo':
            aVal = aData.elo;
            bVal = bData.elo;
            break;
          case 'glicko':
            aVal = aData.glicko;
            bVal = bData.glicko;
            break;
          case 'cost':
            aVal = aData.cost;
            bVal = bData.cost;
            break;
          case 'adjusted':
            aVal = (typeof aData.cost === 'number' && aData.cost > 0)
                     ? getAdjustedScore(aData, currentArena.items)
                     : -Infinity;
            bVal = (typeof bData.cost === 'number' && bData.cost > 0)
                     ? getAdjustedScore(bData, currentArena.items)
                     : -Infinity;
            break;
          default:
            aVal = aData.elo;
            bVal = bData.elo;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        }
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      })
    : [];

  // --- Pareto Frontier ---
  const computeParetoFrontier = (itemsObj) => {
    const itemsArr = Object.entries(itemsObj).map(([id, item]) => ({
      id,
      ...item,
      adjusted:
        typeof item.cost === 'number' && item.cost > 0 && typeof item.glicko === 'number'
          ? getAdjustedScore(item, currentArena.items)
          : -Infinity,
    }));
    let pareto = [];
    for (let i = 0; i < itemsArr.length; i++) {
      const a = itemsArr[i];
      let dominated = false;
      for (let j = 0; j < itemsArr.length; j++) {
        if (i === j) continue;
        const b = itemsArr[j];
        if (
          b.adjusted >= a.adjusted &&
          b.cost <= a.cost &&
          (b.adjusted > a.adjusted || b.cost < a.cost)
        ) {
          dominated = true;
          break;
        }
      }
      if (!dominated) {
        pareto.push(a);
      }
    }
    return pareto;
  };

  // --- Inline Editing for Arena Names ---
  const handleArenaDoubleClick = (key, currentName) => {
    setEditingArenaKey(key);
    setEditingArenaName(currentName);
  };

  const finishArenaEditing = () => {
    if (editingArenaKey && editingArenaName.trim()) {
      setArenas(prev => ({
        ...prev,
        [editingArenaKey]: {
          ...prev[editingArenaKey],
          displayName: editingArenaName.trim(),
        }
      }));
    }
    setEditingArenaKey(null);
    setEditingArenaName('');
  };

  const handleArenaKeyDown = (e) => {
    if (e.key === 'Enter') finishArenaEditing();
  };

  // --- Inline Editing for Item Names ---
  const handleItemDoubleClick = (itemId, currentName) => {
    setEditingItemId(itemId);
    setEditingItemName(currentName);
  };

  const finishItemEditing = () => {
    if (editingItemId && editingItemName.trim()) {
      setArenas(prev => ({
        ...prev,
        [selectedArena]: {
          ...prev[selectedArena],
          items: {
            ...prev[selectedArena].items,
            [editingItemId]: {
              ...prev[selectedArena].items[editingItemId],
              name: editingItemName.trim(),
            }
          }
        }
      }));
    }
    setEditingItemId(null);
    setEditingItemName('');
  };

  const handleItemKeyDown = (e) => {
    if (e.key === 'Enter') finishItemEditing();
  };

  // --- Inline Editing for Item Cost ---
  const handleCostDoubleClick = (itemId, currentCost) => {
    setEditingItemId(itemId);
    setEditingItemCost(currentCost);
  };

  const finishCostEditing = (itemId) => {
    if (editingItemCost !== null) {
      const costValue = parseFloat(editingItemCost);
      if (isNaN(costValue) || costValue <= 0) {
        alert('Cost must be a positive number.');
      } else {
        setArenas(prev => ({
          ...prev,
          [selectedArena]: {
            ...prev[selectedArena],
            items: {
              ...prev[selectedArena].items,
              [itemId]: {
                ...prev[selectedArena].items[itemId],
                cost: costValue,
              }
            }
          }
        }));
      }
    }
    setEditingItemId(null);
    setEditingItemCost(null);
  };

  const handleCostKeyDown = (e, itemId) => {
    if (e.key === 'Enter') finishCostEditing(itemId);
  };

  // --- Persist Arenas to localStorage ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arenas));
  }, [arenas]);

  // --- Update Selected Items Only When Arena Changes ---
  useEffect(() => {
    if (currentArena && Object.keys(currentArena.items).length >= 2) {
      const itemIds = Object.keys(currentArena.items);
      setItem1(itemIds[0]);
      setItem2(itemIds[1]);
    } else {
      setItem1('');
      setItem2('');
    }
  }, [selectedArena]);

  if (!currentArena) {
    return <div>Loading arena data...</div>;
  }

  const paretoFrontier = computeParetoFrontier(currentArena.items);

  return (
    <div className="App">
      <header className="app-header">
        <h1>Pairwise Ranking App</h1>
      </header>

      <nav className="arena-tabs">
        {Object.entries(arenas).map(([key, arena]) => (
          <div key={key} className="arena-tab-wrapper">
            {editingArenaKey === key ? (
              <input
                type="text"
                value={editingArenaName}
                onChange={(e) => setEditingArenaName(e.target.value)}
                onBlur={finishArenaEditing}
                onKeyDown={handleArenaKeyDown}
                autoFocus
                className="arena-edit-input"
              />
            ) : (
              <button
                className={`arena-tab ${selectedArena === key ? 'active' : ''}`}
                onClick={() => setSelectedArena(key)}
                onDoubleClick={() => handleArenaDoubleClick(key, arena.displayName)}
              >
                {arena.displayName}
              </button>
            )}
          </div>
        ))}
        <button
          className="arena-tab new-arena-tab"
          onClick={() => setShowNewArenaInput(!showNewArenaInput)}
        >
          +
        </button>
      </nav>

      {showNewArenaInput && (
        <div className="new-arena-input">
          <form onSubmit={addNewArena}>
            <input
              type="text"
              value={newArenaName}
              onChange={(e) => setNewArenaName(e.target.value)}
              placeholder="New arena name"
            />
            <button type="submit">Create Arena</button>
          </form>
        </div>
      )}

      <div className="main-content">
        <div className="tasting-panel">
          <h2>{currentArena.displayName} Battle</h2>
          {Object.keys(currentArena.items).length >= 2 ? (
            <>
              <div className="dropdowns">
                <label>
                  Item 1:
                  <select value={item1} onChange={(e) => setItem1(e.target.value)}>
                    {Object.entries(currentArena.items).map(([id, data]) => (
                      <option key={id} value={id}>
                        {data.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Item 2:
                  <select value={item2} onChange={(e) => setItem2(e.target.value)}>
                    {Object.entries(currentArena.items).map(([id, data]) => (
                      <option key={id} value={id}>
                        {data.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="buttons">
                <button onClick={() => recordComparison(item1)}>
                  Select {currentArena.items[item1]?.name || "Unknown"} as Winner
                </button>
                <button onClick={() => recordComparison(item2)}>
                  Select {currentArena.items[item2]?.name || "Unknown"} as Winner
                </button>
              </div>
            </>
          ) : (
            <p>Please add at least two items to start comparing.</p>
          )}

          <div className="add-item">
            <h2>Add New Item</h2>
            <form onSubmit={addNewItem}>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
              />
              <input
                type="number"
                value={newItemCost}
                onChange={(e) => setNewItemCost(e.target.value)}
                placeholder="Cost"
                step="0.01"
                min="0"
              />
              <button type="submit">Add Item</button>
            </form>
          </div>

          {Object.keys(currentArena.items).length > 0 && (
            <div className="leaderboard">
              <h2>
                Leaderboard{' '}
                <span className="sort-options">
                  <span onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    Item Name
                  </span>{" | "}
                  <span onClick={() => handleSort('elo')} style={{ cursor: 'pointer' }}>
                    Elo
                  </span>{" | "}
                  <span onClick={() => handleSort('glicko')} style={{ cursor: 'pointer' }}>
                    Glicko-2
                  </span>{" | "}
                  <span onClick={() => handleSort('cost')} style={{ cursor: 'pointer' }}>
                    Cost
                  </span>{" | "}
                  <span onClick={() => handleSort('adjusted')} style={{ cursor: 'pointer' }}>
                    Adjusted Score
                  </span>
                </span>
              </h2>
              {sortedLeaderboard.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Item Name</th>
                      <th onClick={() => handleSort('elo')} style={{ cursor: 'pointer' }}>Elo</th>
                      <th onClick={() => handleSort('glicko')} style={{ cursor: 'pointer' }}>Glicko-2</th>
                      <th onClick={() => handleSort('cost')} style={{ cursor: 'pointer' }}>Cost</th>
                      <th onClick={() => handleSort('adjusted')} style={{ cursor: 'pointer' }}>Adjusted Score</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLeaderboard.map(([id, data]) => (
                      <tr key={id}>
                        <td onDoubleClick={() => handleItemDoubleClick(id, data.name)}>
                          {editingItemId === id && editingItemName !== null ? (
                            <input
                              type="text"
                              value={editingItemName}
                              onChange={(e) => setEditingItemName(e.target.value)}
                              onBlur={finishItemEditing}
                              onKeyDown={handleItemKeyDown}
                              autoFocus
                              className="item-edit-input"
                            />
                          ) : (
                            data.name
                          )}
                        </td>
                        <td>{typeof data.elo === 'number' ? data.elo.toFixed(1) : "N/A"}</td>
                        <td>{typeof data.glicko === 'number' ? data.glicko.toFixed(1) : "N/A"}</td>
                        <td onDoubleClick={() => handleCostDoubleClick(id, data.cost)}>
                          {editingItemId === id && editingItemCost !== null ? (
                            <input
                              type="number"
                              value={editingItemCost}
                              onChange={(e) => setEditingItemCost(e.target.value)}
                              onBlur={() => finishCostEditing(id)}
                              onKeyDown={(e) => handleCostKeyDown(e, id)}
                              autoFocus
                              className="item-edit-input"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            typeof data.cost === 'number' ? data.cost.toFixed(2) : "N/A"
                          )}
                        </td>
                        <td>
                          {typeof data.cost === 'number' && data.cost > 0 && typeof data.glicko === 'number'
                            ? getAdjustedScore(data, currentArena.items).toFixed(1)
                            : "N/A"}
                        </td>
                        <td>
                          <button onClick={() => deleteItem(id)} className="delete-btn">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No items added yet.</p>
              )}
            </div>
          )}
        </div>

        <aside className="history-panel">
          <h2>Historical Battles</h2>
          {currentArena.comparisons.length > 0 ? (
            <ul>
              {currentArena.comparisons.map((battle, idx) => {
                const { date, item1Id, item2Id, winnerId } = battle;
                const item1Name = currentArena.items[item1Id]?.name || "Unknown";
                const item2Name = currentArena.items[item2Id]?.name || "Unknown";
                const winnerName = currentArena.items[winnerId]?.name || "Unknown";
                return (
                  <li key={idx}>
                    <strong>{date}:</strong> {item1Name} vs. {item2Name} – Winner: {winnerName}
                    <button onClick={() => deleteBattle(idx)} className="delete-btn">
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No battles recorded yet.</p>
          )}
        </aside>
      </div>

      {/* Pareto Frontier Section */}
      <div className="pareto-panel">
        <h2>Pareto Optimal Items</h2>
        {Object.keys(currentArena.items).length > 0 ? (
          (() => {
            const itemsArr = Object.entries(currentArena.items).map(([id, item]) => ({
              id,
              ...item,
              adjusted:
                typeof item.cost === 'number' && item.cost > 0 && typeof item.glicko === 'number'
                  ? getAdjustedScore(item, currentArena.items)
                  : -Infinity,
            }));
            let pareto = [];
            for (let i = 0; i < itemsArr.length; i++) {
              const a = itemsArr[i];
              let dominated = false;
              for (let j = 0; j < itemsArr.length; j++) {
                if (i === j) continue;
                const b = itemsArr[j];
                if (
                  b.adjusted >= a.adjusted &&
                  b.cost <= a.cost &&
                  (b.adjusted > a.adjusted || b.cost < a.cost)
                ) {
                  dominated = true;
                  break;
                }
              }
              if (!dominated) {
                pareto.push(a);
              }
            }
            return pareto.length > 0 ? (
              <ul>
                {pareto.map(item => (
                  <li key={item.id}>
                    {item.name} — Glicko: {typeof item.glicko === 'number' ? item.glicko.toFixed(1) : "N/A"}, 
                    Cost: {typeof item.cost === 'number' ? item.cost.toFixed(2) : "N/A"}, 
                    Adjusted: {typeof item.cost === 'number' && item.cost > 0 && typeof item.glicko === 'number'
                      ? getAdjustedScore(item, currentArena.items).toFixed(1)
                      : "N/A"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No Pareto optimal items found.</p>
            );
          })()
        ) : (
          <p>No items to compute Pareto frontier.</p>
        )}
      </div>
    </div>
  );
}

export default App;