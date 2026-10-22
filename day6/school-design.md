# School Database Design

## Tables

### Students
- This table will be storing each student's name and email. student_id is the primary key. 
- name and email are required. 
- Each email must be unique.

### Courses
- This table will store course names.
- course_id is the primary key and course_name is required.

### Enrolments
- records a student's registration on a course and their grade.
- enrolment_id is the primary key.
- student_id and course_id are required foreign keys.
- A grade accepts values from 0 to 100 or NULL when no grade has been awaded.

## Relationships
- students to enrolments is one-to-many. One student has zero or
  more enrolments. Each enrolment belongs to one student.
- courses to enrolments is one-to-many. One course has zero or
  more enrolments. Each enrolment belongs to one course.
- students to courses is many-to-many. A student studies multiple
  courses, and a course has multiple students.

The enrolments join table connects students and courses. Each row
represents one registration and stores its grade. The UNIQUE
constraint on (student_id, course_id) prevents duplicate registrations.

## Suggested Index

I would add an index on enrolments.course_id:

CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

This index helps SQLite find enrolments for a selected course without
scanning the entire enrolments table. The existing UNIQUE constraint
already provides an index starting with student_id.

## SQL or NoSQL?

I would choose SQL because students, courses and enrolments have
structured data and clear relationships. Foreign keys protect
references between records, while UNIQUE and NOT NULL constraints
enforce data rules. Joins support course lists and student reports
without duplicating student or course details. NoSQL offers less
benefit for this system because the main requirements depend on
relationships and consistent records.