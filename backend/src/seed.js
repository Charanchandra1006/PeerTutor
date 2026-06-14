/**
 * Database Seed Script
 * Creates: 1 admin, 10 tutors, 5 students, 15 subjects, 20 sessions, 50 reviews
 *
 * Usage: node src/seed.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./modules/auth/auth.model');
const { TutorProfile, Subject } = require('./modules/tutors/tutor.model');
const { Session } = require('./modules/bookings/booking.model');
const { Review } = require('./modules/reviews/review.model');
const { Wallet, Transaction } = require('./modules/wallet/wallet.model');
const { Notification } = require('./modules/notifications/notification.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ptm_db';

const subjects = [
  { name: 'Data Structures', code: 'CS201', department: 'CSE' },
  { name: 'Algorithms', code: 'CS301', department: 'CSE' },
  { name: 'Database Management Systems', code: 'CS302', department: 'CSE' },
  { name: 'Operating Systems', code: 'CS303', department: 'CSE' },
  { name: 'Computer Networks', code: 'CS401', department: 'CSE' },
  { name: 'Machine Learning', code: 'CS501', department: 'CSE' },
  { name: 'Web Development', code: 'CS202', department: 'CSE' },
  { name: 'Digital Electronics', code: 'EC201', department: 'ECE' },
  { name: 'Signal Processing', code: 'EC301', department: 'ECE' },
  { name: 'VLSI Design', code: 'EC401', department: 'ECE' },
  { name: 'Engineering Mathematics', code: 'MA101', department: 'MATHS' },
  { name: 'Probability & Statistics', code: 'MA201', department: 'MATHS' },
  { name: 'Thermodynamics', code: 'ME201', department: 'MECH' },
  { name: 'Fluid Mechanics', code: 'ME301', department: 'MECH' },
  { name: 'Engineering Physics', code: 'PH101', department: 'PHYSICS' },
];

const tutorData = [
  { name: 'Arjun Reddy', bio: 'Senior CSE student specializing in data structures and algorithms. 3 years of competitive programming experience.', rate: 30, year: 4, branch: 'CSE' },
  { name: 'Priya Sharma', bio: 'Final year student with expertise in DBMS and web development. Love making complex topics simple.', rate: 25, year: 4, branch: 'CSE' },
  { name: 'Karthik Nair', bio: 'ML enthusiast with published research papers. Expert in Python and scikit-learn.', rate: 40, year: 4, branch: 'CSE' },
  { name: 'Sneha Patel', bio: 'Top scorer in Computer Networks and OS. Patient teacher who explains with real-world examples.', rate: 20, year: 3, branch: 'CSE' },
  { name: 'Rahul Kumar', bio: 'ECE topper with strong fundamentals in digital electronics and signal processing.', rate: 35, year: 4, branch: 'ECE' },
  { name: 'Divya Krishnan', bio: 'Mathematics gold medalist. Making calculus and probability fun since 2022.', rate: 30, year: 3, branch: 'MATHS' },
  { name: 'Vikram Singh', bio: 'Full-stack developer with internship experience at top tech companies. React + Node expert.', rate: 45, year: 4, branch: 'CSE' },
  { name: 'Ananya Gupta', bio: 'VLSI design specialist with hands-on FPGA experience. Clear and structured teaching approach.', rate: 35, year: 4, branch: 'ECE' },
  { name: 'Rohan Mehta', bio: 'Mechanical engineering star. Fluent in thermodynamics and fluid mechanics concepts.', rate: 25, year: 3, branch: 'MECH' },
  { name: 'Lakshmi Venkat', bio: 'Physics lover with a knack for explaining quantum mechanics and relativity in simple terms.', rate: 20, year: 3, branch: 'PHYSICS' },
];

const studentData = [
  { name: 'Aditya Prakash', year: 2, branch: 'CSE' },
  { name: 'Meera Joshi', year: 1, branch: 'CSE' },
  { name: 'Suresh Babu', year: 2, branch: 'ECE' },
  { name: 'Kavya Nair', year: 1, branch: 'MECH' },
  { name: 'Farhan Khan', year: 2, branch: 'CSE' },
];

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await mongoose.connection.db.dropDatabase();

    // 1. Create subjects
    console.log('📚 Creating subjects...');
    const createdSubjects = await Subject.insertMany(subjects);
    console.log(`   Created ${createdSubjects.length} subjects`);

    // 2. Create admin
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      email: 'admin@vardhaman.org',
      password_hash: 'Admin@123',
      name: 'M. Charan Chandra ',
      role: 'admin',
      year: null,
      branch: 'CSE',
      is_email_verified: true,
      is_active: true,
      is_profile_complete: true,
    });
    await Wallet.create({ user_id: admin._id, balance: 10000 });
    console.log(`   Admin: admin@vardhaman.org / Admin@123`);

    // 3. Create tutors
    console.log('🎓 Creating tutors...');
    const createdTutors = [];
    for (let i = 0; i < tutorData.length; i++) {
      const t = tutorData[i];
      const email = `${t.name.split(' ')[0].toLowerCase()}${i + 1}@vardhaman.org`;

      const user = await User.create({
        email,
        password_hash: 'Tutor@123',
        name: t.name,
        role: 'tutor',
        year: t.year,
        branch: t.branch,
        is_email_verified: true,
        is_active: true,
        is_profile_complete: true,
        learning_style: ['visual', 'auditory', 'reading', 'kinesthetic'][i % 4],
      });

      // Assign 2-3 subjects
      const subjectIds = createdSubjects
        .filter(s => s.department === t.branch || s.department === 'MATHS')
        .slice(0, 3)
        .map(s => s._id);

      const profile = await TutorProfile.create({
        user_id: user._id,
        subjects: subjectIds,
        bio: t.bio,
        rate_per_hour: t.rate,
        total_sessions: Math.floor(Math.random() * 30) + 5,
        avg_rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(2)),
        is_verified_badge: i < 5,
        languages: ['English', 'Hindi', 'Telugu'].slice(0, 1 + (i % 3)),
        availability: [
          { day: 1, start_time: '09:00', end_time: '12:00' },
          { day: 3, start_time: '14:00', end_time: '17:00' },
          { day: 5, start_time: '10:00', end_time: '13:00' },
        ],
        resources: [
          {
            title: `Study Guide - ${t.name}`,
            description: 'Comprehensive notes and practice problems.',
            file_url: 'https://example.com/notes.pdf',
            subject_id: subjectIds.length > 0 ? subjectIds[0] : null,
            credit_cost: Math.floor(Math.random() * 5),
            download_count: Math.floor(Math.random() * 50),
          }
        ],
      });

      await Wallet.create({
        user_id: user._id,
        balance: 100 + Math.floor(Math.random() * 500),
        total_earned: Math.floor(Math.random() * 1000),
      });

      createdTutors.push({ user, profile });
    }
    console.log(`   Created ${createdTutors.length} tutors`);

    // 4. Create students
    console.log('📖 Creating students...');
    const createdStudents = [];
    for (let i = 0; i < studentData.length; i++) {
      const s = studentData[i];
      const email = `${s.name.split(' ')[0].toLowerCase()}${i + 1}@vardhaman.org`;

      const user = await User.create({
        email,
        password_hash: 'Student@123',
        name: s.name,
        role: 'student',
        year: s.year,
        branch: s.branch,
        is_email_verified: true,
        is_active: true,
        is_profile_complete: true,
        learning_style: ['visual', 'auditory', 'reading', 'kinesthetic'][i % 4],
        xp_points: Math.floor(Math.random() * 500) + 100,
        badges: [
          { type: ['quick_learner', 'session_streak', 'subject_master', 'escape_artist'][i % 4], earned_at: new Date() }
        ],
      });

      await Wallet.create({
        user_id: user._id,
        balance: 50 + Math.floor(Math.random() * 200),
        total_spent: Math.floor(Math.random() * 100),
      });

      createdStudents.push(user);
    }
    console.log(`   Created ${createdStudents.length} students`);

    // 5. Create sessions
    console.log('📅 Creating sessions...');
    const statuses = ['completed', 'completed', 'completed', 'confirmed', 'pending', 'cancelled'];
    const createdSessions = [];
    for (let i = 0; i < 20; i++) {
      const tutor = createdTutors[i % createdTutors.length];
      const student = createdStudents[i % createdStudents.length];
      const subject = createdSubjects[i % createdSubjects.length];
      const status = statuses[i % statuses.length];

      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + (i - 10)); // Past and future dates

      const session = await Session.create({
        tutor_id: tutor.profile._id,
        student_id: student._id,
        subject_id: subject._id,
        scheduled_at: scheduledAt,
        duration_minutes: [30, 60, 90][i % 3],
        status,
        credits_reserved: tutor.profile.rate_per_hour,
        credits_released: status === 'completed' ? Math.floor(tutor.profile.rate_per_hour * 0.9) : 0,
        video_link: `https://meet.jit.si/ptm-${subject.name.replace(/\s+/g, '-').toLowerCase()}-${i}`,
        notes: status === 'completed' ? `Session notes for ${subject.name}. Covered key concepts and solved practice problems.` : '',
      });
      createdSessions.push(session);
    }
    console.log(`   Created ${createdSessions.length} sessions`);

    // 6. Create reviews
    console.log('⭐ Creating reviews...');
    const comments = [
      'Excellent explanation! Very clear and patient.',
      'Really helped me understand the concept. Would book again.',
      'Good session but could have been more organized.',
      'Amazing tutor! Made complex topics simple.',
      'Decent session. Covered the basics well.',
      'Very knowledgeable and friendly. Highly recommend!',
      'Helped me prepare for my exam. Got a great score!',
      'Could improve on time management, but content was good.',
      'Best tutor on the platform. Worth every credit.',
      'Solid session. Good use of examples.',
    ];

    let reviewCount = 0;
    for (let i = 0; i < createdSessions.length && reviewCount < 50; i++) {
      const session = createdSessions[i];
      if (session.status !== 'completed') continue;

      const tutor = createdTutors.find(t => t.profile._id.toString() === session.tutor_id.toString());
      if (!tutor) continue;

      // Student reviews tutor
      await Review.create({
        session_id: session._id,
        reviewer_id: session.student_id,
        reviewee_id: tutor.user._id,
        reviewer_role: 'student',
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5
        comment: comments[reviewCount % comments.length],
        is_approved: true,
      });
      reviewCount++;

      if (reviewCount >= 50) break;

      // Tutor reviews student (some sessions)
      if (i % 2 === 0) {
        await Review.create({
          session_id: session._id,
          reviewer_id: tutor.user._id,
          reviewee_id: session.student_id,
          reviewer_role: 'tutor',
          rating: Math.floor(Math.random() * 2) + 4,
          comment: 'Great student! Prepared and engaged.',
          is_approved: true,
        });
        reviewCount++;
      }
    }
    console.log(`   Created ${reviewCount} reviews`);

    // Summary
    console.log('\n✅ Seed complete! Login credentials:');
    console.log('   Admin: admin@vardhaman.org / Admin@123');
    console.log('   Tutors: arjun1@vardhaman.org / Tutor@123 (and similar)');
    console.log('   Students: aditya1@vardhaman.org / Student@123 (and similar)');
    console.log('\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
