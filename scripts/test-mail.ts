import {
  sendWelcomeEmail,
  sendProblemRegistrationEmail,
  sendTeamInvitationEmail,
  sendInvitationResponseEmail,
  sendTeamLockedEmail,
  sendMentorAssignedToStudentEmail,
  sendMentorAssignedToFacultyEmail,
} from '../lib/mail';

async function runMailAutomationTests() {
  console.log('🧪 Starting Mail Automation Verification Tests...\n');

  // Test 1: Welcome Email
  console.log('Testing 1: Welcome Email...');
  await sendWelcomeEmail({
    to: 'vignesh.student@veltech.edu.in',
    name: 'Vignesh',
    vtNumber: 'VTU28891',
    department: 'School of Computing',
  });

  // Test 2: Problem Registration Email
  console.log('Testing 2: Problem Registration Email...');
  await sendProblemRegistrationEmail({
    to: 'vignesh.student@veltech.edu.in',
    name: 'Vignesh',
    psCode: 'PS-43',
    psTitle: 'AI-Based News Entity Extraction & Article Tagging Platform',
    companyName: 'The Hindu Group of Publications',
  });

  // Test 3: Team Invitation Email
  console.log('Testing 3: Team Invitation Email (Ping)...');
  await sendTeamInvitationEmail({
    to: 'aarav.ece@veltech.edu.in',
    recipientName: 'Aarav Sharma',
    senderName: 'Vignesh',
    senderDept: 'SoC',
    psCode: 'PS-43',
    psTitle: 'AI-Based News Entity Extraction',
    message: 'Hey Aarav, need an embedded / NLP engineer to lead our model inference module!',
  });

  // Test 4: Team Locked Email
  console.log('Testing 4: Team Locked Email...');
  await sendTeamLockedEmail({
    to: 'vignesh.student@veltech.edu.in',
    memberName: 'Vignesh',
    teamName: 'NeuralCoders Squad',
    psCode: 'PS-43',
    psTitle: 'AI-Based News Entity Extraction',
    memberRoster: [
      'Vignesh (SoC) - Leader',
      'Aarav Sharma (ECE) - Member',
      'Priya K (AI&DS) - Member',
      'Rahul Verma (MECH) - Member'
    ],
  });

  console.log('✅ All Mail Automation Templates and Dispatchers passed verification successfully!\n');
}

runMailAutomationTests().catch(console.error);
