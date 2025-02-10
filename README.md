# Elo Experiment

A modern web app implementing the Elo rating system for pairwise comparisons. Initially designed for apple tastings, this application allows users to compare items, track ratings dynamically, and maintain a historical log of past comparisons.

## Features

- **Pairwise Comparisons** – Select two items and record which one wins.
- **Elo Rating System** – Dynamically updates rankings based on outcomes.
- **Add New Items** – Users can add new items to the comparison pool.
- **Historical Log** – A side panel tracks all past comparisons.
- **Delete Battles** – Removing a past battle recalculates ratings as if it never happened.
- **Persistent Storage** – Data is saved in localStorage for consistency across sessions.
- **Modern UI** – Clean, sleek design optimized for desktop and mobile devices.

## Installation

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your system.

### Steps
1. **Clone the Repository**
   ```sh
   git clone https://github.com/bpisaneschi/elo-experiment.git
   cd elo-experiment
   ```
2. **Install Dependencies**
   ```sh
   npm install
   ```
3. **Run the Application**
   ```sh
   npm start
   ```
   The app should open at `http://localhost:3000`.

## Usage

### Comparing Items
1. Select two different items from the dropdown.
2. Click the button to mark the winner.
3. The leaderboard updates in real time.

### Adding New Items
1. Enter a new item name in the "Add New Apple" section.
2. Click "Add Apple." The item appears in the dropdown with a default rating.

### Viewing & Managing Historical Comparisons
- The "Historical Battles" panel shows past comparisons.
- Click "Delete" to remove a battle and recalculate ratings without it.

## Deployment

To deploy the app to GitHub Pages:
1. **Build the project:**
   ```sh
   npm run build
   ```
2. **Deploy to GitHub Pages:**
   ```sh
   npm run deploy
   ```
Ensure the repository is configured for GitHub Pages hosting.

## Technologies Used

- **React** – Frontend framework
- **JavaScript (ES6+)** – Core language
- **CSS3** – Styled using modern UI principles
- **localStorage** – Persistent client-side data storage

## Contributing

Contributions are welcome! Feel free to fork the repo, submit issues, or create pull requests.

## License

This project is licensed under the [MIT License](LICENSE).

