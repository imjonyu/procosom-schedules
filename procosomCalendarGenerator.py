import pandas as pd
#import requests
#from bs4 import BeautifulSoup
import re
import json
from ics import Calendar, Event
from datetime import datetime
import pytz
import sqlite3
#import hashlib
#import time
#import functools
from sqlalchemy.orm import Session, aliased
from sqlalchemy import select, or_, func
from procosomDbDefinition import engine, Season, Division, Game, Conference, Team
import os
os.makedirs("calendars", exist_ok=True)


## Need to
## Read the database for all teams
## Search the DB for games for that team
## Generate an ical for that team
#teams = session.query(Team).all()

## okay so now I need to fix my division_id in the database
## But now the query works and returns all the data I need
## I can build the ICAL part next

saveLocation = "./calendars"
HomeTeam = aliased(Team)
AwayTeam = aliased(Team)
with Session(engine) as session:
    season = session.execute(
        select(Season).order_by(Season.season_id.desc()).limit(1)
    ).scalar_one()
    
    print(season.season_id)  # 26
    print(season.name)
    
    teams = session.execute(
        select(Team).where(Team.season_id==season.season_id)
        ).scalars().all()
    
    division_name = ""
    for team in teams:
        print(team.name)
        games = (
            session.query(Game, HomeTeam, AwayTeam, Division, Season)
            .join(HomeTeam, Game.home_team_id == HomeTeam.team_id)
            .join(AwayTeam, Game.away_team_id == AwayTeam.team_id)
            .join(Division, Game.division_id == Division.division_id)
            .join(Season, Game.season_id == Season.season_id)
            .filter(
                (Game.home_team_id == team.team_id) |
                (Game.away_team_id == team.team_id)
            )
            #.where(team.team_id == 1214)
            .all()
        )
        #print(games)
        
        cal = Calendar()
        for game, home, away, division, season in games:
            #print(game.game_id)
            #print(game.date)
            #print(home.name)   # home team name
            #print(away.name)   # away team name
            #print(division.division_id)
            #print(season.name)
            #generate_iCal_calendar(game,home,away,division,season)
            ##############3
            hour, minute = game.time[:2], game.time[3:5] 
            year,month,day = game.date[:4], game.date[5:7], game.date[8:10]
            local_tz = pytz.timezone("America/Toronto")
            start_time = local_tz.localize(datetime(int(year),int(month),int(day), int(hour), int(minute)))
            utc_time = start_time.astimezone(pytz.utc)
            title = f"{division.name}"
            if game.playoffs == 1:
                title = f"Series: {division.name}: "
            
            e = Event()
            e.name = title + ": " + str(home.name) + " c. " + str(away.name) # Event title
            e.begin = utc_time.isoformat()  # Start date and time (ISO format: YYYY-MM-DDTHH:MM:SS)
            e.duration = {"hours": 1}  # Duration in hours
            e.location = game.gym  # Location
            if game.url:
                e.url = f"http://www.procosom.com/{game.url}"
            e.uid = f"{game.checksum}"  # Unique ID
            cal.events.add(e)
            division_name = division.name
            

        # Save to .ics file
        with open(f"{saveLocation}/{team.name.replace(' ', '-')}-{division_name}-{season.name.replace(' ', '-')}.ics", "w") as file:
            file.writelines(cal)

        print(f"iCal file generated: {saveLocation}/{team.name.replace(' ', '-')}-{division_name}-{season.name.replace(' ', '-')}.ics")