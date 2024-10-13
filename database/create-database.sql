CREATE TABLE test_ship_position (
    id int not null,
    ship_pos_start varchar(2) not null,
    ship_pos_end varchar(2) not null,
    is_valid varchar(1) not null,
    PRIMARY KEY (id)
);
INSERT INTO test_ship_position (id, ship_pos_start, ship_pos_end, is_valid) VALUES
(1, 'A1', 'A2', "N"),
(2, 'A0', 'A4', "N"),
(3, 'A7', 'A11', "N"),
(4, 'K1', 'K5', "N"),
(5, 'B2', 'B6', "Y"),
(6, 'D3', 'G3', "Y"),
(7, 'J4', 'J7', "Y");

CREATE TABLE test_attack_position (
    id int not null,
    attack_pos varchar(2) not null,
    is_valid varchar(1) not null,
    PRIMARY KEY (id)
);
INSERT INTO test_attack_position (id, attack_pos, is_valid) VALUES
(1, 'A0', "N"),
(2, 'A11', "N"),
(3, 'K7', "N"),
(4, '01', "N"),
(5, 'B2', "Y"),
(6, 'D3', "Y"),
(7, 'J4', "Y");
