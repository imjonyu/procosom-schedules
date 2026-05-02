document.addEventListener('DOMContentLoaded', function() {
    // Version 1.0.4
    // Fetch and display the latest season
    fetch('season.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0 && data[0].season_name) {
                const seasonStr = data[0].season_name;
                if (typeof seasonStr === 'string' && seasonStr.length > 0) {
                    document.getElementById('latest-season').textContent = 
                        seasonStr.charAt(0).toUpperCase() + seasonStr.slice(1);
                } else {
                    document.getElementById('latest-season').textContent = 'Season data invalid';
                }
            } else {
                document.getElementById('latest-season').textContent = 'Season data missing';
            }
        })
        .catch(error => {
            document.getElementById('latest-season').textContent = 'Error loading season data: ' + error.message;
        });

    // Load teams based on division selection
    const divisionSelect = document.getElementById('division');
    const latestSeason = document.getElementById('latest-season');
    const teamsSelect = document.getElementById('teams');
    const icsPath = document.getElementById('ics-path');
    const copyButton = document.getElementById('copy-ics');

    // Map division values to their display names
    const divisionMap = {
        'a': 'A',
        'b': 'B',
        'c': 'C',
        'd': 'D',
        'e': 'E'
    };

    // Function to load teams for a specific division
    async function loadTeams(divisionValue) {
        if (!divisionValue || !latestSeason.textContent || latestSeason.textContent === 'Loading...' || latestSeason.textContent.includes('Error')) {
            return;
        }

        try {
            // Fetch season.json
            const seasonResponse = await fetch('season.json');
            if (!seasonResponse.ok) {
                throw new Error(`HTTP error! status: ${seasonResponse.status}`);
            }
            const seasonData = await seasonResponse.json();

            if (!seasonData || seasonData.length === 0 || !seasonData[0].season_id || !seasonData[0].season_name) {
                teamsSelect.innerHTML = '<option value="">Season data missing or invalid</option>';
                teamsSelect.disabled = true;
                icsPath.value = 'Cannot determine season for ICS path';
                copyButton.disabled = true;
                return;
            }

            const seasonId = seasonData[0].season_id;
            const seasonName = seasonData[0].season_name;

            // Format season name: capitalize first letter and keep the rest as is
            // Convert to proper format: 26-Hiver-2026
            const seasonNameFormatted = seasonName.replace(/ /g, '-');
            const teamsPath = `calendars/${seasonId}-${seasonNameFormatted}/teams.json`;

            // Fetch teams.json
            const teamsResponse = await fetch(teamsPath);
            if (!teamsResponse.ok) {
                throw new Error(`HTTP error! status: ${teamsResponse.status}`);
            }
            const teams = await teamsResponse.json();

            // Filter teams by division - convert divisionValue to uppercase to match team data
            const divisionTeams = teams.filter(team => team.division === divisionValue.toUpperCase());

            // Update teams dropdown
            teamsSelect.innerHTML = '';

            if (divisionTeams.length === 0) {
                teamsSelect.innerHTML = '<option value="">No teams found for this division</option>';
                teamsSelect.disabled = true;
                icsPath.value = 'No teams found for this division';
                copyButton.disabled = true;
            } else {
                teamsSelect.disabled = false;
                divisionTeams.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.team;
                    option.textContent = team.team;
                    teamsSelect.appendChild(option);
                });

                // Reset ICS path and button when teams are loaded
                icsPath.value = 'Select a team to see the ICS file path';
                copyButton.disabled = true;
            }

            // Add event listener for team selection
            teamsSelect.addEventListener('change', function() {
                if (this.value) {
                    // Construct ICS file path: {TeamName}-{Division}-{Season}.ics
                    const teamName = this.value;
                    const divisionLetter = divisionValue.toUpperCase();
                    const seasonNameClean = seasonName.replace(/ /g, '-');
                    const icsFileName = `${teamName}-${divisionLetter}-${seasonId}-${seasonNameClean}.ics`;
                    const icsPathValue = `calendars/${seasonId}-${seasonNameFormatted}/${icsFileName}`;

                    // Create full GitHub.io URL
                    const githubUsername = 'imjonyu';
                    const repoName = 'procosom-scheduler';
                    const githubUrl = `https://${githubUsername}.github.io/${repoName}/docs/${icsPathValue}`;

                    // Update ICS path display
                    icsPath.value = githubUrl;
                    copyButton.disabled = false;
                } else {
                    icsPath.value = 'Select a team to see the ICS file path';
                    copyButton.disabled = true;
                    // Reset teams dropdown to "Select Team"
                    teamsSelect.innerHTML = '<option value="">Select Team</option>';
                }
            });

        } catch (error) {
            teamsSelect.innerHTML = '<option value="">Error loading teams: ' + error.message + '</option>';
            teamsSelect.disabled = true;
            icsPath.value = 'Error loading teams: ' + error.message;
            copyButton.disabled = true;
        }
    }

    // Add event listener for division selection
    divisionSelect.addEventListener('change', function() {
        loadTeams(this.value);
    });

    // Load teams for the default selection if there is one
    if (divisionSelect.value) {
        loadTeams(divisionSelect.value);
    }

    // Add event listener for copy button
    copyButton.addEventListener('click', function() {
        const icsPathValue = icsPath.value;
        navigator.clipboard.writeText(icsPathValue).then(() => {
            this.textContent = 'Copied!';
            setTimeout(() => {
                this.textContent = 'Copy ICS Path';
            }, 2000);
        }).catch(err => {
            this.textContent = 'Copy Failed';
            setTimeout(() => {
                this.textContent = 'Copy ICS Path';
            }, 2000);
        });
    });
});