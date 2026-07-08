const feedbackData = require('../master/managerFeedback');
const { randomElement, randomElements, shuffle } = require('../utils/random');

/**
 * Helper to determine persona category based on employee skills
 */
function getPersonaCategory(employee) {
  const des = employee.designation;
  if (des === 'Engineering Manager') return 'Engineering Management';
  if (des === 'Solution Architect') return 'Architecture';
  if (employee.primarySkills.length > 0) {
    return employee.primarySkills[0].category;
  }
  return 'Backend';
}

/**
 * Generates manager reviews for all employees.
 * Modifies employees in place and returns reviews list.
 */
function generateManagerReviews(employees) {
  const reviews = [];

  employees.forEach(employee => {
    const persona = getPersonaCategory(employee);
    const rating = employee.performanceRating;
    const sentences = [];

    // 1. Select Strengths
    const strengthsPool = feedbackData.strengths[persona] || feedbackData.strengths['Backend'];
    if (rating >= 4.5) {
      // 2 strengths for high performers
      sentences.push(...randomElements(strengthsPool, 2));
    } else {
      // 1 strength for standard performers
      sentences.push(randomElement(strengthsPool));
    }

    // 2. Select Achievements
    const achievementsPool = feedbackData.achievements[persona] || feedbackData.achievements['Backend'];
    if (achievementsPool && achievementsPool.length > 0) {
      sentences.push(randomElement(achievementsPool));
    }

    // 3. Select Leadership Indicator
    if (rating >= 4.0 || Math.random() > 0.5) {
      sentences.push(randomElement(feedbackData.leadership));
    }

    // 4. Select Growth Areas
    const growthPool = feedbackData.growthAreas;
    if (rating < 4.5) {
      sentences.push(randomElement(growthPool));
    } else if (Math.random() > 0.6) {
      // High performers might get a softer or occasional growth area
      sentences.push(randomElement(growthPool));
    }

    // Shuffle sentences slightly to vary structure, then join
    const feedbackParagraph = shuffle(sentences).join(' ');
    
    // Assign to employee object
    employee.managerFeedback = feedbackParagraph;

    // Push to standalone reviews list
    reviews.push({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      designation: employee.designation,
      managerId: employee.managerId,
      managerName: employee.managerName,
      performanceRating: rating,
      review: feedbackParagraph
    });
  });

  return reviews;
}

module.exports = {
  generateManagerReviews
};
