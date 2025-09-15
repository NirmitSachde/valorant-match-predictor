# Valorant Match Predictor Pro

A comprehensive web application for predicting Valorant esports match outcomes using advanced team composition analysis, player synergy calculations, and map preferences.

## Overview

Valorant Match Predictor Pro is an interactive tool designed for esports analysts, coaches, and enthusiasts to predict match outcomes between professional Valorant teams. The application uses multiple data points including team statistics, player synergies, map preferences, agent selections, and role compositions to generate detailed match predictions.

## Features

### 🎯 Core Functionality
- **Team Selection**: Search and select from professional Valorant teams
- **Player Roster Building**: Choose 5 players per team with synergy recommendations
- **Map Analysis**: View team-specific map win rates and advantages
- **Agent Selection**: Assign agents to players with role composition tracking
- **Weighted Predictions**: Customize prediction weights across 6 key factors
- **Detailed Results**: Get win probability percentages with confidence metrics

### 📊 Advanced Analytics
- **Player Synergy Calculations**: Real-time synergy scores between players
- **Team Performance Metrics**: Average ratings, K/D ratios, and ACS scores
- **Map Preference Rankings**: Best to worst maps for selected teams
- **Role Composition Analysis**: Track team balance across Duelist, Initiator, Controller, and Sentinel roles
- **Top Player Indicators**: Highlights top 5 performers for each team

### 🎨 User Experience
- **Step-by-Step Workflow**: 6 guided steps from team selection to final prediction
- **Real-time API Status**: Connection monitoring with visual indicators
- **Smart Suggestions**: Players with high synergy are highlighted during selection
- **Progressive Disclosure**: Each step unlocks as prerequisites are completed
- **Responsive Design**: Optimized for desktop viewing

## Technical Requirements

### Dependencies
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Active internet connection for API calls
- JavaScript enabled

### API Integration
The application connects to a Valorant statistics API (via Netlify Functions) for:
- Team rosters and historical data
- Player performance statistics
- Map win rates and preferences
- Agent role classifications
- Synergy calculations

## How to Use

1. **Step 1 - Team Selection**
   - Search and select your team
   - Search and select the opponent team

2. **Step 2 - Player Selection**
   - Choose 5 players for each team
   - View synergy recommendations as you build rosters
   - Monitor team statistics (synergy, pair synergy, average rating)

3. **Step 3 - Map Selection**
   - Review map rankings based on team performance
   - Select the map for the match
   - Note recommended picks and bans

4. **Step 4 - Agent Selection**
   - Assign agents to each player
   - View player's best agents and roles
   - Monitor role composition balance

5. **Step 5 - Prediction Configuration**
   - Adjust weight sliders for 6 prediction factors:
     - Team Matchup (default: 25%)
     - Player Synergy (default: 20%)
     - Map Advantage (default: 20%)
     - Role Composition (default: 15%)
     - Agent Selection (default: 10%)
     - Individual Form (default: 10%)

6. **Step 6 - View Results**
   - See predicted winner and win probability
   - Review confidence level
   - Analyze individual factor contributions

## Prediction Factors Explained

- **Team Matchup**: Head-to-head historical performance between teams
- **Player Synergy**: How well selected players work together based on past games
- **Map Advantage**: Team's win rate and comfort on the selected map
- **Role Composition**: Balance and viability of selected agent roles
- **Agent Selection**: Player proficiency with chosen agents
- **Individual Form**: Recent individual player performance metrics

## Data Sources

The application utilizes:
- Professional match history
- Player performance statistics
- Team composition data
- Map-specific win rates
- Agent pick rates and success rates

## Limitations

- Predictions are based on historical data and may not account for:
  - Recent roster changes
  - Player injuries or substitutions
  - Meta shifts or game updates
  - Psychological factors or team morale
  - Specific tournament contexts

## Best Practices

1. **Complete All Steps**: For most accurate predictions, fill in all available data
2. **Consider Context**: Use predictions as one input alongside other analysis
3. **Adjust Weights**: Customize weights based on your analytical priorities
4. **Review Synergies**: Pay attention to suggested player combinations
5. **Map Selection**: Consider both team preferences and recent performance

## Troubleshooting

- **API Connection Issues**: Check internet connection and refresh page
- **Missing Players**: Some historical players may not appear in current rosters
- **Loading Delays**: Large data requests may take a few seconds
- **Clear Selections**: Use clear buttons to reset individual sections

## Future Enhancements

Potential improvements could include:
- Tournament-specific predictions
- Recent form weighting
- Player substitution scenarios
- Best-of-3/5 series predictions
- Historical prediction accuracy tracking
- Export functionality for reports

## License

This tool is for educational and analytical purposes.

## Support

For issues or suggestions, please contact sachde.nirmit@gmail.com