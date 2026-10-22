CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);


CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL
);


CREATE TABLE enrollments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade REAL CHECK (grade BETWEEN 0 AND 100),

    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id),

    UNIQUE (student_id, course_id)
);

INSERT INTO students (student_id, name, email)
VALUES 
    (1, "Steve Okoth", 'steve@student.com'),
    (2, "Michael Oginga", 'michael@student.com'),
    (3, "Scarlet Maina", 'scarlet@student.com'),
    (4, "Michel Muitherero", 'michel@student.com'),
    (5, "Katherine Wanyama", 'katherine@student.com');

INSERT INTO courses (course_id, course_name)
VALUES
    (1, "Cyber Security"),
    (2, "Web Development"),
    (3, "Networking");

INSERT INTO enrollments (enrolment_id, student_id, course_id, grade)
VALUES
    (1, 1, 1, 95),
    (2, 1, 2, 85),
    (3, 2, 1, 92),
    (4, 2, 3, NULL),
    (5, 3, 2, 74);

-- Finding all course for one student
SELECT 
    s.name, 
    c.course, 
    e.grade
FROM students AS s,
JOIN enrollments as e ON e.student_id = s.student_id
JOIN courses as c ON c.course_id = e.course_id
WHERE s.name = 'Michael Oginga'
ORDER BY c.course_name;

-- find students who are taking one course
SELECT 
    c.course_name, 
    s.name, 
    s.email
FROM courses AS c
JOIN enrollments AS e ON e.course_id = c.course_id
JOIN students AS s ON s.student_id = e.student_id
WHERE c.course_name = 'Web Development'
ORDER BY s.name;

-- counting the number of studens per course, even courses with no students
SELECT
    c.course_id,
    c.course_name,
    COUNT(e.student_id) AS student_count
FROM courses AS c
LEFT JOIN enrolments AS e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_name;

-- finding students with no enrolment
SELECT
    s.student_id,
    s.name,
    s.email
FROM students AS s
WHERE NOT EXISTS (
    SELECT 1
    FROM enrolments AS e
    WHERE e.student_id = s.student_id
)
ORDER BY s.name;

-- updating an enrolment grade
UPDATE enrolments
SET grade = 88
WHERE enrolment_id = 2;