INSERT INTO users (user_id, password, name, email, is_admin) 
VALUES(
    1,
    '$2b$12$AZH7virni5jlTTiGgEg4zu3lSvAw68qVEfSIOjJ3RqtbJbdW/Oi5q',
    'Camden Tadhg',
    'camdent@gmail.com',
    true),
    (2,
    '$2b$12$AZH7virni5jlTTiGgEg4zu3lSvAw68qVEfSIOjJ3RqtbJbdW/Oi5q', 
    'Diane Bradshaw', 
    'dianebradshaw@test.com', 
    false),
    (3,
    '$2b$12$AZH7virni5jlTTiGgEg4zu3lSvAw68qVEfSIOjJ3RqtbJbdW/Oi5q', 
    'Dorian Lindsey',
    'dorianlindsey@test.com',
    false);

INSERT INTO diagnoses (diagnosis_id, diagnosis, synonyms) 
VALUES (
    1,'myalgic encephalomyelitis', ARRAY ['cfs', 'chronic fatigue symdrome', 'me']),
    (2, 'fibromyalgia', ARRAY[]::text[]),
    (3, 'lyme disease', ARRAY['tick-borne borreliosis', 'lyme arthritis', 'borreliosis', 'chronic lyme disease']),
    (4, 'chronic obstructive pulmonary disease', ARRAY['copd']),
    (5, 'ehlers-danlos symdrome', ARRAY['eds']),
    (6, 'diabetes', ARRAY['type one diabetes', 'type two diabetes']),
    (7, 'ulcerative colitis', ARRAY[]::text[]),
    (8, 'irritable bowel symdrom', ARRAY['ibs']),
    (9, 'asthma', ARRAY[]::text[]),
    (10, 'als', ARRAY['lou gehrigs disease']),
    (11, 'rheumatoid arthritis', ARRAY['ra']),
    (12, 'postural orthostatic tachycardia syndrom', ARRAY['pots']),
    (13, 'small intestinal bacterial overgrowth', ARRAY['sibo'] ),
    (14, 'long covid', ARRAY[]::text[]),
    (15, 'depression', ARRAY['mdd', 'major depressive disorder'] ),
    (16, 'anxiety', ARRAY['gad', 'generalized anxiety disorder']),
    (17, 'bipolar disorder', ARRAY['manic depression', 'manic-depression', 'mania']), 
    (18, 'post-traumatic stress disorder', ARRAY['ptsd']),
    (19, 'anorexia', ARRAY['anorexia nervosa']),
    (20, 'leaky gut syndrome', ARRAY[]::text[]),
    (21, 'migraine', ARRAY['headache']),
    (22, 'eczema', ARRAY[]::text[]),
    (23, 'osteoporosis', ARRAY[]::text[]),
    (24, 'alzheimers disease', ARRAY[]::text[]), 
    (25, 'parkinsons disease', ARRAY[]::text[]);

INSERT INTO users_diagnoses (user_id, diagnosis_id, keywords)
VALUES  (1, 11, ARRAY['pain']),
        (1, 12, ARRAY[]::text[]),
        (2, 1, ARRAY['fatigue', 'long covid']),
        (2, 12, ARRAY['low blood pressure']),
        (2, 8, ARRAY['constipation', 'diarrhea']),
        (3, 5, ARRAY[]::text[]),
        (3, 14, ARRAY['long-hauler', 'long-haul', 'covid-19']);

INSERT INTO symptoms (symptom_id, symptom)
VALUES  (1, 'nausea'), 
        (2, 'fatigue'),
        (3, 'pain'),
        (4, 'anxiety'),
        (5, 'depression'),
        (6, 'vertigo'), 
        (7, 'dizziness'), 
        (8, 'headache'),
        (9, 'brain fog'),
        (10, 'racing thoughts'), 
        (11, 'stimming'), 
        (12, 'fever'), 
        (13, 'constipation'), 
        (14, 'diarrhea'), 
        (15, 'cough'), 
        (16, 'shortness of breath'), 
        (17, 'sinus congestion'),
        (18, 'asthma'),
        (19, 'acne'),
        (20, 'dermatitis'), 
        (21, 'eczema'),
        (22, 'rash'),
        (23, 'hives'),
        (24, 'chest pain'),
        (25, 'joint pain');

INSERT INTO users_symptoms (user_id, symptom_id)
VALUES  (1, 7),
        (1, 6),
        (1, 4),
        (1, 25),
        (1, 5),
        (2, 2), 
        (2, 9),
        (2, 7), 
        (2, 5),
        (2, 17),
        (3, 3),
        (3, 2),
        (3, 1),
        (3, 5), 
        (3, 20);

INSERT INTO symptom_tracking (user_id, symptom_id, tracked_at, track_date, timespan, severity)
VALUES  (1, 7, '2024-09-14 04:05:06.789', '2024-09-14', '12-4 PM', 3),
        (1, 7, '2024-09-14 06:05:04.789', '2024-09-14', '12-4 AM', 1),
        (1, 7, '2024-09-14 12:25:32.383', '2024-09-14', '4-8 AM', 3),
        (1, 7, '2024-09-14 15:23:32.345', '2024-09-14', '8 AM-12 PM', 2),
        (1, 7, '2024-09-14 23:33:21.354', '2024-09-14', '4-8 PM', 1), 
        (1, 7, '2024-09-14 23:33:21.234', '2024-09-14', '8 PM-12 AM', 1),
        (1, 4, '2024-09-14 04:05:06.789', '2024-09-14','12-4 PM', 4),
        (1, 4, '2024-09-14 06:05:04.789', '2024-09-14', '12-4 AM', 4),
        (1, 4, '2024-09-14 12:25:32.383', '2024-09-14', '4-8 AM', 4),
        (1, 4, '2024-09-14 15:23:32.345', '2024-09-14', '8 AM-12 PM', 5),
        (1, 4, '2024-09-14 23:33:21.354', '2024-09-14', '4-8 PM', 1), 
        (1, 4, '2024-09-14 23:33:21.234', '2024-09-14', '8 PM-12 AM', 2),
        (2, 9, '2024-09-14 04:05:06.789','2024-09-14', '12-4 PM', 4),
        (2, 9, '2024-09-14 06:05:04.789', '2024-09-14', '12-4 AM', 4),
        (2, 9, '2024-09-14 12:25:32.383', '2024-09-14', '4-8 AM', 4),
        (2, 9, '2024-09-14 15:23:32.345', '2024-09-14', '8 AM-12 PM', 5),
        (2, 9, '2024-09-14 23:33:21.354', '2024-09-14', '4-8 PM', 1), 
        (2, 9, '2024-09-14 23:33:21.234', '2024-09-14', '8 PM-12 AM', 2),
        (3, 20, '2024-09-14 04:05:06.789','2024-09-14', '12-4 PM', 1),
        (3, 20, '2024-09-14 06:05:04.789', '2024-09-14', '12-4 AM', 1),
        (3, 20, '2024-09-14 12:25:32.383', '2024-09-14', '4-8 AM', 1),
        (3, 20, '2024-09-14 15:23:32.345', '2024-09-14', '8 AM-12 PM', 1),
        (3, 20, '2024-09-14 23:33:21.354', '2024-09-14', '4-8 PM', 1), 
        (3, 20, '2024-09-14 23:33:21.234', '2024-09-14', '8 PM-12 AM', 2),
        (1, 4, '2024-09-15 04:05:06.789', '2024-09-15', '12-4 PM', 1),
        (1, 4, '2024-09-15 06:05:04.789', '2024-09-15', '12-4 AM', 2),
        (1, 4, '2024-09-15 12:25:32.383', '2024-09-15', '4-8 AM', 3),
        (1, 4, '2024-09-15 15:23:32.345', '2024-09-15', '8 AM-12 PM', 4),
        (1, 4, '2024-09-15 23:33:21.354', '2024-09-15', '4-8 PM', 5), 
        (1, 4, '2024-09-15 23:33:21.234', '2024-09-15', '8 PM-12 AM', 2);

INSERT INTO medications (med_id, medication)
VALUES  (1, 'acyclovir'),
        (2, 'naratriptan'),
        (3, 'metformin'),
        (4, 'albuterol'),
        (5, 'gabapentin'), 
        (6, 'd-mannose'),
        (7, 'acetaminophen'),
        (8, 'tylenol'), 
        (9, 'advil'),
        (10, 'ibuprofen'), 
        (11, 'atorvastatin'),
        (12, 'lisinopril'),
        (13, 'levothyroxine'),
        (14, 'amlodipine'),
        (15, 'losartan'), 
        (16, 'omeprazole'), 
        (17, 'sertraline'), 
        (18, 'hydrochlorothiazide'),
        (19, 'rosuvastatin'),
        (20, 'escitalopram'),
        (21, 'trazodone'),
        (22, 'bupropion'),
        (23, 'fluoxetine'), 
        (24, 'fluticasone'),
        (25, 'apixaban');

INSERT INTO users_medications (user_id, med_id, dosage_num, dosage_unit, time_of_day)
VALUES  (1, 6, 300, 'mg', ARRAY['AM', 'PM']::time_of_day[]), 
        (1, 13, 150, 'mg', ARRAY['AM']::time_of_day[]),
        (1, 8, 1, 'pill', ARRAY['Midday']::time_of_day[]), 
        (1, 12, 200, 'mg', ARRAY['AM', 'Midday', 'PM', 'Evening']::time_of_day[]), 
        (1, 2, 100, 'mg', ARRAY['Evening']::time_of_day[]), 
        (2, 18, 60, 'mg', ARRAY['AM', 'PM']::time_of_day[]), 
        (2, 15, 350, 'mg', ARRAY['AM']::time_of_day[]), 
        (2, 25, 50, 'mg', ARRAY['Evening']::time_of_day[]),
        (2, 9, 3, 'mg', ARRAY['AM', 'Midday', 'PM', 'Evening']::time_of_day[]), 
        (2, 5, 3, 'pills', ARRAY['AM']::time_of_day[]),
        (3, 6, 150, 'mg', ARRAY['AM', 'PM']::time_of_day[]), 
        (3, 21, 300, 'mg', ARRAY['AM']::time_of_day[]), 
        (3, 3, 1, 'pill', ARRAY['Evening']::time_of_day[]), 
        (3, 11, 1, 'session', ARRAY['PM']::time_of_day[]), 
        (3, 18, 250, 'mg', ARRAY['Midday']::time_of_day[]);

INSERT INTO medication_tracking (user_id, med_id, tracked_at, track_date, time_of_day, number)
VALUES 
    (1, 6, '2024-09-14 23:33:21.354', '2024-09-14', 'AM', 1),
    (1, 6, '2024-09-14 23:33:21.354', '2024-09-14', 'PM', 1),
    (1, 6, '2024-09-13 08:08:17.354', '2024-09-13', 'AM', 1), 
    (1, 6, '2024-09-13 22:08:17.345', '2024-09-13', 'PM', 1),
    (1, 13, '2024-09-14 08:08:17.345', '2024-09-14', 'AM', 2),
    (1, 13, '2024-09-13 22:08:17.345', '2024-09-13', 'AM', 1),
    (1, 8, '2024-09-14 21:45:17.345', '2024-09-14', 'Midday', 1),
    (1, 12, '2024-09-14 08:08:17.345', '2024-09-14', 'AM', 1),
    (1, 12, '2024-09-14 12:18:32.345', '2024-09-14', 'Midday', 2),
    (1, 12, '2024-09-14 15:18:32.346', '2024-09-14', 'PM', 1),
    (1, 12, '2024-09-14 18:34:23.345', '2024-09-14', 'Evening', 1),
    (1, 2, '2024-09-14 20:23:23.346', '2024-09-14', 'Evening', 1),
    (1, 2, '2024-09-13 20:23:23.357', '2024-09-13', 'Evening', 1), 
    (2, 18, '2024-09-14 23:33:21.354', '2024-09-14', 'AM', 1),
    (2, 18, '2024-09-14 08:45:16.357', '2024-09-14', 'PM', 1), 
    (2, 18, '2024-09-13 22:10:34.368', '2024-09-13', 'AM', 1), 
    (2, 18, '2024-09-13 22:10:34.367', '2024-09-13', 'PM', 1), 
    (2, 9, '2024-09-14 10:16:23.357', '2024-09-14', 'Midday', 1), 
    (2, 9, '2024-09-14 12:15:23.376', '2024-09-14', 'PM', 1),
    (2, 9, '2024-09-13 10:16:23.357', '2024-09-13', 'AM', 1),
    (2, 9, '2024-09-13 23:15:17.386', '2024-09-13', 'Evening', 1),
    (3, 21, '2024-09-14 15:05:17.345', '2024-09-14', 'AM', 1), 
    (3, 21, '2024-09-13 15:05:17.235', '2024-09-13', 'AM', 1),
    (3, 11, '2024-09-14 1:15:16.344', '2024-09-14', 'PM', 1),
    (3, 11, '2024-09-13 1:15:16.345', '2024-09-13', 'PM', 1);