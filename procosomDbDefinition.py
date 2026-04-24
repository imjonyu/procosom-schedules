from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, relationship

engine = create_engine("sqlite:///procosom.db")

# Tables: seasons, divisions, conferences, teams, games


class Base(DeclarativeBase):
    pass

class Season(Base):
    __tablename__   = "seasons"
    season_id       = Column(Integer, primary_key=True, unique=True)
    name            = Column(String)
    year            = Column(Integer)
    __table_args__  = (UniqueConstraint("season_id"),)

class Division(Base):
    __tablename__   = "divisions"
    division_id     = Column(Integer, primary_key=True)
    season_id       = Column(Integer, ForeignKey("seasons.season_id"))
    name            = Column(String)
    __table_args__  = (UniqueConstraint("division_id"),)

class Conference(Base):
    __tablename__   = "conferences"
    conference_id   = Column(Integer, primary_key=True)
    name            = Column(String) # East West
    __table_args__  = (UniqueConstraint("conference_id"),)

class Team(Base):
    __tablename__ = "teams"
    team_id = Column(Integer, primary_key=True)
    season_id = Column(Integer, ForeignKey("seasons.season_id"))
    division_id = Column(Integer, ForeignKey("divisions.division_id"))
    conference = Column(Integer, ForeignKey("conferences.conference_id"))
    name = Column(String)
    points = Column(Integer)
    __table_args__ = (UniqueConstraint("team_id"),)

class Game(Base):
    __tablename__   = "games"
    game_id         = Column(Integer, primary_key=True)
    season_id       = Column(Integer, ForeignKey("seasons.season_id"))
    division_id     = Column(Integer, ForeignKey("divisions.division_id"))
    date            = Column(String)
    time            = Column(String)
    gym             = Column(String)
    home_team_id    = Column(Integer, ForeignKey("teams.team_id"))
    away_team_id    = Column(Integer, ForeignKey("teams.team_id"))
    url             = Column(String)
    playoffs        = Column(Integer)
    checksum        = Column(String)
    __table_args__  = (UniqueConstraint("game_id","season_id"),)

Base.metadata.create_all(engine)