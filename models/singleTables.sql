CREATE TABLE genre (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	image TEXT
);

CREATE TABLE company (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	location TEXT,
	founded  DATE,
	image TEXT
);

CREATE TABLE game (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	ps3 BOOLEAN NOT NULL,
	ps4 BOOLEAN NOT NULL,
	ps5 BOOLEAN NOT NULL,
	copies INTEGER NOT NULL,
	price INTEGER NOT NULL,
	image TEXT
);

