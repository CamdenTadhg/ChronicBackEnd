CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
        CHECK (position('@' IN email) > 1),
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT false
);

CREATE TABLE diagnoses (
    diagnosis_id SERIAL PRIMARY KEY,
    diagnosis TEXT NOT NULL,
    synonyms TEXT[]
);

CREATE UNIQUE INDEX unique_lowercase_diagnosis ON diagnoses(LOWER(diagnosis));

CREATE TABLE users_diagnoses (
    user_id INTEGER REFERENCES users (user_id) ON DELETE CASCADE,
    diagnosis_id INTEGER REFERENCES diagnoses (diagnosis_id),
    keywords TEXT[],
    PRIMARY KEY (user_id, diagnosis_id)
);

CREATE TABLE symptoms (
    symptom_id SERIAL PRIMARY KEY,
    symptom TEXT NOT NULL UNIQUE
);

CREATE UNIQUE INDEX unique_lowercase_symptom ON symptoms(LOWER(symptom));

CREATE TABLE users_symptoms (
    user_id INTEGER REFERENCES users (user_id) ON DELETE CASCADE,
    symptom_id INTEGER REFERENCES symptoms (symptom_id),
    PRIMARY KEY (user_id, symptom_id)
);

CREATE TYPE timespan AS ENUM ('12-4 AM', '4-8 AM', '8 AM-12 PM', '12-4 PM', '4-8 PM', '8 PM-12 AM');

CREATE OR REPLACE FUNCTION set_data_timestamp_symptoms()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.timespan = '12-4 AM' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '00:00:00';
    ELSEIF NEW.timespan = '4-8 AM' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '04:00:00';
    ELSEIF NEW.timespan = '8 AM-12 PM' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '08:00:00';
    ELSEIF NEW.timespan = '12-4 PM' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '12:00:00';
    ELSEIF NEW.timespan = '4-8 PM' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '16:00:00';
    ELSEIF NEW.timespan = '8 PM-12 AM' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '20:00:00';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE symptom_tracking (
    symtrack_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    symptom_id INTEGER NOT NULL,
    tracked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    track_date DATE NOT NULL,
    timespan timespan NOT NULL,
    data_timestamp TIMESTAMP NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 0 AND severity <= 5),
    FOREIGN KEY (user_id, symptom_id) REFERENCES users_symptoms (user_id, symptom_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT unique_symptom_tracking UNIQUE(user_id, symptom_id, track_date, timespan)
);

CREATE TRIGGER before_insert_symptom_tracking
BEFORE INSERT ON symptom_tracking
FOR EACH ROW
EXECUTE FUNCTION set_data_timestamp_symptoms();

CREATE TABLE medications (
    med_id SERIAL PRIMARY KEY,
    medication TEXT NOT NULL UNIQUE
);

CREATE UNIQUE INDEX unique_lowercase_medication ON medications(LOWER(medication));

CREATE TABLE users_medications (
    user_id INTEGER REFERENCES users (user_id) ON DELETE CASCADE,
    med_id INTEGER REFERENCES medications (med_id),
    dosage_num INTEGER, 
    dosage_unit TEXT,
    time_of_day TEXT[],
    PRIMARY KEY (user_id, med_id)
);

CREATE OR REPLACE FUNCTION set_data_timestamp_meds()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.time_of_day = 'AM' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '08:00:00';
    ELSEIF NEW.time_of_day = 'Midday' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '12:00:00';
    ELSEIF NEW.time_of_day = 'PM' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '18:00:00';
    ELSEIF NEW.time_of_day = 'Evening' THEN
        NEW.data_timestamp := NEW.track_date + INTERVAL '22:00:00';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TYPE time_of_day AS ENUM('AM', 'Midday', 'PM', 'Evening');

CREATE TABLE medication_tracking (
    medtrack_id SERIAL PRIMARY KEY, 
    user_id INTEGER NOT NULL,
    med_id INTEGER NOT NULL,
    tracked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    track_date DATE NOT NULL,
    time_of_day time_of_day NOT NULL,
    data_timestamp TIMESTAMP NOT NULL,
    number INTEGER CHECK (number >= 1),
    FOREIGN KEY (user_id, med_id) REFERENCES users_medications (user_id, med_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT unique_medication_tracking UNIQUE(user_id, med_id, track_date, time_of_day)
);

CREATE TRIGGER before_insert_medication_tracking
BEFORE INSERT ON medication_tracking
FOR EACH ROW
EXECUTE FUNCTION set_data_timestamp_meds();