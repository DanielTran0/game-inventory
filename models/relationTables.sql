CREATE TABLE GameGenre (
  id SERIAL PRIMARY KEY,
  gameid INTEGER NOT NULL REFERENCES game (id),
	genreid INTEGER NOT NULL REFERENCES genre (id),
  UNIQUE (gameid, genreid)
);

CREATE TABLE GameCompany (
  id SERIAL PRIMARY KEY,
  gameid INTEGER NOT NULL REFERENCES game (id),
	companyid INTEGER NOT NULL REFERENCES company (id),
  UNIQUE (gameid, companyid)
);


