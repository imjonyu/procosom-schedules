document.addEventListener('DOMContentLoaded', function() {
    // Add language toggle functionality at the beginning
    let currentLang = 'en';
    
    // Load translation files
    const translations = {};
    
    Promise.all([
        fetch('translations/en.json').then(response => response.json()),
        fetch('translations/fr.json').then(response => response.json())
    ]).then(([en, fr]) => {
        translations.en = en;
        translations.fr = fr;
        
        // Set up language toggle button
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.addEventListener('click', function() {
                toggleLanguage();
            });
        }
        
        // Initialize content with English translations
        updateContent();
    });
    
    function toggleLanguage() {
        currentLang = currentLang === 'en' ? 'fr' : 'en';
        updateContent();
        updateLangToggle();
    }
    
    function updateLangToggle() {
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.textContent = currentLang === 'en' ? 'Français' : 'English';
        }
    }
    
    function updateContent() {
        const t = translations[currentLang];
        if (!t) return;
        
        // Update dropdown labels
        const seasonLabel = document.querySelector('.dropdown-container label');
        if (seasonLabel) seasonLabel.textContent = t.season;
        
        const divisionLabel = document.querySelector('label[for="division"]');
        if (divisionLabel) divisionLabel.textContent = t.division;
        
        const teamsLabel = document.querySelector('label[for="teams"]');
        if (teamsLabel) teamsLabel.textContent = t.teams;
        
        const icsPathLabel = document.querySelector('label[for="ics-path"]');
        if (icsPathLabel) icsPathLabel.textContent = t.icsPath;
        
        // Update dropdown options
        const divisionSelect = document.getElementById('division');
        if (divisionSelect) {
            divisionSelect.querySelector('option[value=""]').textContent = t.selectDivision;
        }
        
        const teamsSelect = document.getElementById('teams');
        if (teamsSelect) {
            teamsSelect.querySelector('option[value=""]').textContent = t.selectTeam;
        }
        
        // Update ICS path input placeholder
        const icsPath = document.getElementById('ics-path');
        if (icsPath) {
            if (icsPath.value === 'Select a team to see the ICS file path' || 
                icsPath.value === 'Veuillez sélectionner une équipe pour voir le chemin d\'accès au fichier ICS') {
                icsPath.value = currentLang === 'en' ? 'Select a team to see the ICS file path' : 'Veuillez sélectionner une équipe pour voir le chemin d\'accès au fichier ICS';
            }
        }
        
        // Update button text
        const copyButton = document.getElementById('copy-ics');
        if (copyButton) {
            copyButton.textContent = currentLang === 'en' ? 'Copy ICS Path' : 'Copier le chemin ICS';
        }
        
        const subscribeButton = document.getElementById('subscribe-ics');
        if (subscribeButton) {
            subscribeButton.textContent = currentLang === 'en' ? 'Subscribe to Calendar' : 'S\'abonner au calendrier';
        }
        
        // Update subscription instructions
        const subscriptionHeader = document.querySelector('.subscription-instructions h3');
        if (subscriptionHeader) subscriptionHeader.textContent = t.howToSubscribe;
        
        const appleHeader = document.querySelector('.subscription-instructions h4');
        if (appleHeader) appleHeader.textContent = t.appleCalendar;
        
        const googleHeader = document.querySelectorAll('.subscription-instructions h4')[1];
        if (googleHeader) googleHeader.textContent = t.googleCalendar;
        
        // Update list items for Apple instructions
        const appleListItems = document.querySelectorAll('.subscription-instructions ol:first-of-type li');
        if (appleListItems.length > 0 && t.appleInstructions) {
            appleListItems.forEach((item, index) => {
                if (t.appleInstructions[index]) {
                    item.innerHTML = t.appleInstructions[index];
                }
            });
        }
        
        // Update list items for Google instructions
        const googleListItems = document.querySelectorAll('.subscription-instructions ol:nth-of-type(2) li');
        if (googleListItems.length > 0 && t.googleInstructions) {
            googleListItems.forEach((item, index) => {
                if (t.googleInstructions[index]) {
                    item.innerHTML = t.googleInstructions[index];
                }
            });
        }
        
        // Update notes
        const notes = document.querySelectorAll('.subscription-instructions p');
        if (notes.length >= 2 && t.note && t.note2) {
            notes[0].innerHTML = '<em>' + t.note + '</em>';
            notes[1].innerHTML = '<em>' + t.note2 + '</em>';
        }
    }
    
    // Version 1.1.0
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
    const subscribeButton = document.getElementById('subscribe-ics');

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
            teamsSelect.innerHTML = '<option value="">Select Team</option>';

            if (divisionTeams.length === 0) {
                teamsSelect.innerHTML += '<option value="">No teams found for this division</option>';
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
                const teamName = this.value.replace(/ /g, '-');
                const divisionLetter = divisionValue.toUpperCase();
                const seasonNameClean = seasonName.replace(/ /g, '-');
                const icsFileName = `${teamName}-${divisionLetter}-${seasonNameClean}.ics`;
                const icsPathValue = `calendars/${seasonId}-${seasonNameFormatted}/${icsFileName}`;

                // Create full GitHub.io URL
                const githubUsername = 'imjonyu';
                const repoName = 'procosom-schedules';
                const githubUrl = `https://${githubUsername}.github.io/${repoName}/${icsPathValue}`;

                    // Update ICS path display
                    icsPath.value = githubUrl;
                    copyButton.disabled = false;
                    subscribeButton.disabled = false;
                } else {
                    icsPath.value = 'Select a team to see the ICS file path';
                    copyButton.disabled = true;
                    subscribeButton.disabled = true;
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
            const t = translations[currentLang];
            this.textContent = t.copyIcs;
            setTimeout(() => {
                this.textContent = t.copyIcs;
            }, 2000);
        }).catch(err => {
            const t = translations[currentLang];
            this.textContent = t.copyFailed;
            setTimeout(() => {
                this.textContent = t.copyIcs;
            }, 2000);
        });
    });
    });
    
    // Add event listener for subscribe button
    subscribeButton.addEventListener('click', function() {
        const icsPathValue = icsPath.value;
        if (icsPathValue && icsPathValue !== 'Select a team to see the ICS file path') {
            // Create webcal URL by replacing https with webcal
            const webcalUrl = icsPathValue.replace('https://', 'webcal://');
            
            // Open webcal URL to subscribe in macOS Calendar app
            window.location.href = webcalUrl;
            
            // Show feedback
            const t = translations[currentLang];
            this.textContent = t.subscribeSuccess;
            setTimeout(() => {
                const t = translations[currentLang];
                this.textContent = t.subscribeCalendar;
            }, 2000);
        } else {
            const t = translations[currentLang];
            this.textContent = t.subscribe;
            setTimeout(() => {
                const t = translations[currentLang];
                this.textContent = t.subscribeCalendar;
            }, 2000);
        }
    });
});