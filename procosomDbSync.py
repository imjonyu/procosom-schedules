import pandas as pd
import requests
from bs4 import BeautifulSoup
import re
import json
from datetime import datetime
import pytz
import sqlite3
import hashlib
import time
import functools
from sqlalchemy.orm import Session
from sqlalchemy import select
from procosomDbDefinition import engine, Season, Division, Game, Conference, Team

# Functions available:
# download_divisions(season_id,url="http://www.procosom.com/ajax/admin.php")
# download_teams(division_id,url="http://www.procosom.com/ajax/admin.php"):
# download_seasons(url="http://www.procosom.com/horaires.php?")
# download_schedule(url="http://www.procosom.com/horaires.php?",php_options="")
# convert_date(date_str, year=2026)
# convert_time(time_str)
# add_checksum(record)

def timing_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        elapsed_time = end_time - start_time
        print(f"Function '{func.__name__}' executed in {elapsed_time:.4f} seconds")
        return result
    return wrapper

### Need to convert date to a proper format
#@timing_decorator
def convert_date(date_str, year=2026):  # Default year if missing
    # Extract day and month
    day, month = date_str[:2], date_str[3:5]  
    # Convert to a proper date format
    formatted_date = datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
    return formatted_date.strftime("%Y-%m-%d")  # Full readable format

### Need to convert time to a proper format
#@timing_decorator
def convert_time(time_str):  
    # Extract hour and minute
    hour, minute = time_str[:2], time_str[3:5]  
    # Convert to a proper date format
    formatted_date = datetime.strptime(f"{hour}-{minute}", "%H-%M")
    return formatted_date.strftime("%H:%M")  # Full readable format

# Function to compute checksum for each record
#@timing_decorator
def add_checksum(record):
    json_str = json.dumps(record, sort_keys=True)  # Ensure consistent ordering
    checksum = hashlib.md5(json_str.encode()).hexdigest()  # Generate SHA-256 hash
    record["checksum"] = checksum  # Add checksum field
    return record

@timing_decorator
def download_divisions(season_id,url="http://www.procosom.com/ajax/admin.php"):
    if not season_id: # turn this into a try, catch and exception
        print("Missing season_id")
        return 1
    response = requests.post(
        url,
        data={
            "task": "getCompetitionLiguesOptions", 
            "id": season_id
            }
    )
    soup = BeautifulSoup(response.text, "html.parser")
    return [
        {"division_id": opt["value"], "name": opt.get_text()}
        for opt in soup.find_all("option")
        if opt["value"] != "-1"
    ]

# Can't download all teams at once, unless we send a requests to the equipes.php page and parse the whole thing
# So we gotta do it division by division
@timing_decorator
def download_teams(division_id,url="http://www.procosom.com/ajax/admin.php"):
    if not division_id:
        print("Missing division_id")
        return 1
    response = requests.post(
        url,
        data={
            "task": "getEquipesSaisonOptions", 
            "id": division_id,
            "homeAway": "false"
            }
    )
    def parse_team_data(team,url="http://www.procosom.com/equipe.php?id="):
        if not team["team_id"]:
            print("Missing team_id")
            return 1
        #print(url+team["team_id"])
        response = requests.get(
            url+team["team_id"],
        )
        response.encoding = "iso-8859-1"
        soup1 = BeautifulSoup(response.text, "html.parser")
    
        def extract(label):
            node = soup1.find("label", string=lambda t: t and label in t)
            if not node:
                return None
            span = node.find_next_sibling("span")
            return span.get_text(strip=True) if span else None
        return {
            "team_id":      team["team_id"],
            "name":         team["name"],
            "division":       extract("LIGUE"),
            "conference":   extract("Conférence"),
        }
    
    soup = BeautifulSoup(response.text, "html.parser")
    team = {}
    teams = []
    for opt in soup.find_all("option"):
        if opt["value"] != "-1":
            team = {"team_id": opt["value"], "name": opt.get_text() }
            teams.append(parse_team_data(team))
        
    return teams

@timing_decorator
def download_seasons(url="http://www.procosom.com/horaires.php",php_filter="?filtre%5BhasCompetition%5D=26&filtre%5BhasLigue%5D=128&filtre%5BhasSegment%5D=4&filtre%5Bgroupe%5D=-1&filtre%5BhasTeam%5D=-1&filtre%5Bsemaine%5D=-1&filtre%5BhasOfficiel%5D=-1&action=filter"):
    response = requests.get(url+php_filter)
    response.encoding = "iso-8859-1"
    soup = BeautifulSoup(response.text, "html.parser")

    # The first <select> on the page is the competition dropdown
    select = soup.find("select")  

    return [
        {"season_id": opt["value"], "name": opt.get_text(strip=True), "year": opt.get_text(strip=True).split()[1] if opt["value"] != '-1' else 0}
        for opt in select.find_all("option")
        if opt["value"] != "0"  # skip the "Toutes" placeholder
    ]

# At this point, I'm just scraping all schedule data, no need for filters
# segment=2 regular season
# segment=4 playoffs
# Need to find a way to separate the two to store properly
# Could set the filter in the php_options
@timing_decorator
def download_schedule(url="http://www.procosom.com/horaires.php?",php_options="filtre%5BhasSegment%5D=2"):
    response = requests.get(url+php_options)
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, "html.parser")
        table = soup.find("table")  # Adjust based on structure
        headers = [th.text.strip().encode().decode() for th in table.find_all("th")]
        data = []
        count = 0
        for row in table.find_all("tr")[1:]: # Skip header row
            game_sheet_url = None
            home_team_id = 0
            away_team_id = 0
            all_ids = {}
            
            columns = [col.text.strip().encode().decode().replace("\n", " - ") for col in row.find_all("td")]  # Adjust based on structure
            row_dict = dict(zip(headers, columns))  # Convert to dictionary
            row_dict = add_checksum(row_dict)  # Add checksum ## Need to update the checksum, cause it will change
            #data.append(row_dict)
            
            links = row.find_all("a", href=True)
            for link in links:
                href = link["href"]
                #print(href)
                if "feuille-pointage.php?match=" in href:
                    #date_url = href
                    game_sheet_url = href
                elif "equipe.php?id=" in href:
                    if href.split('=')[-1] != '':
                        
                        # Determine if it's home or away team based on position
                        # Assuming first team link is home team, second is away team
                        if home_team_id == 0:
                            home_team_id = href.split('=')[-1]
                        else:
                            away_team_id = href.split('=')[-1]
            all_ids = {"game_sheet_url":game_sheet_url,"home_team_id":home_team_id,"away_team_id":away_team_id}
            row_dict.update(all_ids)
            data.append(row_dict)    
            
        # Convert all date fields in the dictionary
        for event in data:
            if "date" in event:
                event["date"] = convert_date(event["date"])

        # Convert all time fields in the dictionary
        for event in data:
            if "heure" in event:
                event["heure"] = convert_time(event["heure"])
        return data


######### Start of business logic

## If new_season, then we need to collect all the data available
## If season is a few weeks old, we can assume that teams/divisions are set
## But how do we select our current season?
## I guess it doesn't matter since the schedule link is always latest season
## For the sync it doesn't care at this point
new_season = True

if new_season == True:
    # Download all available Seasons, find the current season (latest one)
    # We are always working on the latest season
    seasons = download_seasons()
    current_season = seasons[-1]

    # Download the divisions for the latest seasons
    divisions = download_divisions(current_season["season_id"])

    teams = []
    # For each division, download all teams available this season
    for division in divisions:
        teams.extend(download_teams(division["division_id"]))

# Download the full season schedule
schedule = download_schedule()
playoffs = download_schedule(php_options="filtre%5BhasSegment%5D=4")

with Session(engine) as session:
    # Update Seasons
    season_data = Season(season_id=int(current_season["season_id"]), 
                         name=current_season["name"],
                         year=int(current_season["year"]))
    session.merge(season_data)
    
    # Update Divisions
    for division in divisions:
        division_data = Division(division_id=int(division["division_id"]),
                                 name=division["name"], 
                                 season_id=int(current_season["season_id"]))
        session.merge(division_data)
    
    # Update Teams
    for team in teams:
        team_data = Team(team_id=int(team["team_id"]), 
                         season_id=int(current_season["season_id"]), 
                         division_id=team["division"], 
                         conference=team["conference"], 
                         name=team["name"])
        session.merge(team_data)
    
    # Build a id lookup based on division name
    division_lookup = {d["name"]: d["division_id"] for d in divisions}
    # {"A": 126, "B": 127, ...}
    
    # Update Schedule
    for game in schedule:
        schedule_data = Game(game_id=int(game["#"]), 
                             season_id=int(current_season["season_id"]), 
                             division_id=division_lookup[game["ligue"]], 
                             date=game["date"], 
                             time=game["heure"], 
                             gym=game["lieu"], 
                             home_team_id=int(game["home_team_id"]), 
                             away_team_id=int(game["away_team_id"]),
                             url=game["game_sheet_url"], 
                             playoffs=0,
                             checksum=game["checksum"])
        session.merge(schedule_data)

    for game in playoffs:
        playoffs_data = Game(game_id=int(game["#"]), 
                             season_id=int(current_season["season_id"]), 
                             division_id=division_lookup[game["ligue"]], 
                             date=game["date"], 
                             time=game["heure"], 
                             gym=game["lieu"], 
                             home_team_id=int(game["home_team_id"]), 
                             away_team_id=int(game["away_team_id"]),
                             url=game["game_sheet_url"], 
                             playoffs=1,
                             checksum=game["checksum"])
        session.merge(playoffs_data)

    try:
        session.commit()
    except:
        session.rollback()
        raise