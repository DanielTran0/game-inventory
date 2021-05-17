INSERT INTO game (name,ps3,ps4,ps5,copies,price) VALUES ('God of War', false, true, false, 10,50);
INSERT INTO game (name,ps3,ps4,ps5,copies,price) VALUES ('Uncharted 2', true, true, false, 14,50);

INSERT INTO company (name,location,founded) VALUES ('naughty dog', 'usa', '1984-05-05');
INSERT INTO company (name,location,founded) VALUES ('sucker puch', 'usa', '2000-11-02');

INSERT INTO genre (name) VALUES ('fps');
INSERT INTO genre (name) VALUES ('action');

INSERT INTO GameGenre (gameid,genreid) VALUES (1, 2);
INSERT INTO GameGenre (gameid,genreid) VALUES (1, 1);
INSERT INTO GameCompany (gameid,companyid) VALUES (1, 2);
INSERT INTO GameGenre (gameid,genreid) VALUES (2, 1);
INSERT INTO GameCompany (gameid,companyid) VALUES (2, 2);
