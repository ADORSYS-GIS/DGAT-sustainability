import {
  dbService,
  User,
  Organization,
  Template,
  Category,
  Question,
} from "./indexedDB";

// Initialize with demo data
export const initializeDemo = async (): Promise<void> => {
  await dbService.init();

  // Check if already initialized
  const existingUsers = await dbService.getAll<User>("users");
  if (existingUsers.length > 0) return;

  // Create demo organizations
  const organizations: Organization[] = [
    {
      organizationId: "org_1",
      name: "Green Fields Cooperative",
      location: "Eastern Cape, South Africa",
      contactEmail: "info@greenfields.coop",
      description: "Agricultural cooperative focused on sustainable farming",
    },
    {
      organizationId: "org_2",
      name: "Ubuntu Farmers Union",
      location: "KwaZulu-Natal, South Africa",
      contactEmail: "contact@ubuntu-farmers.org",
      description: "Farmer union promoting community-based agriculture",
    },
  ];

  for (const org of organizations) {
    await dbService.add("organizations", org);
  }

  // Create demo users
  const users: User[] = [
    {
      userId: "user_admin",
      username: "admin",
      password: "password", // In real app, this would be encrypted
      role: "admin",
      email: "admin@dgrv.org",
      firstName: "Sarah",
      lastName: "Schmidt",
    },
    {
      userId: "user_john",
      username: "john",
      password: "password",
      role: "org_user",
      organizationId: "org_1",
      organizationName: "Green Fields Cooperative",
      email: "john@greenfields.coop",
      firstName: "John",
      lastName: "Mthembu",
    },
    {
      userId: "user_thandi",
      username: "thandi",
      password: "password",
      role: "org_admin",
      organizationId: "org_1",
      organizationName: "Green Fields Cooperative",
      email: "thandi@greenfields.coop",
      firstName: "Thandi",
      lastName: "Khumalo",
    },
  ];

  for (const user of users) {
    await dbService.add("users", user);
  }

  // Create demo templates
  const templates: Template[] = [
    {
      templateId: "dgat_template",
      name: "Digital Gap Analysis Tool",
      toolType: "dgat",
    },
    {
      templateId: "sustainability_template",
      name: "Sustainability Assessment",
      toolType: "sustainability",
    },
  ];

  for (const template of templates) {
    await dbService.add("templates", template);
  }

  // Create demo categories
  const categories: Category[] = [
    {
      categoryId: "cat_env",
      name: "Environmental Impact",
      weight: 25,
      templateId: "sustainability_template",
      order: 1,
    },
    {
      categoryId: "cat_social",
      name: "Social Equity",
      weight: 25,
      templateId: "sustainability_template",
      order: 2,
    },
    {
      categoryId: "cat_gov",
      name: "Governance",
      weight: 25,
      templateId: "sustainability_template",
      order: 3,
    },
    {
      categoryId: "cat_fin",
      name: "Financial Stability",
      weight: 25,
      templateId: "sustainability_template",
      order: 4,
    },
    {
      categoryId: "cat_digital_infra",
      name: "Digital Infrastructure",
      weight: 30,
      templateId: "dgat_template",
      order: 1,
    },
    {
      categoryId: "cat_digital_skills",
      name: "Digital Skills",
      weight: 40,
      templateId: "dgat_template",
      order: 2,
    },
    {
      categoryId: "cat_digital_usage",
      name: "Digital Usage",
      weight: 30,
      templateId: "dgat_template",
      order: 3,
    },
  ];

  for (const category of categories) {
    await dbService.add("categories", category);
  }

  // Create demo questions
  const questions: Question[] = [
    {
      questionId: "q_env_1",
      text: {
        en: "Does your cooperative have a recycling program?",
        zu: "Ingabe umfelandawonye wakho unomgomo wokugayisa kabusha?",
      },
      type: "yes_no",
      weight: 5,
      categoryId: "cat_env",
      templateId: "sustainability_template",
      order: 1,
    },
    {
      questionId: "q_env_2",
      text: {
        en: "What percentage of your energy comes from renewable sources?",
        zu: "Yini iphesenti lamandla akho avela emithonjeni evuselelekayo?",
      },
      type: "percentage",
      weight: 8,
      categoryId: "cat_env",
      templateId: "sustainability_template",
      order: 2,
    },
    {
      questionId: "q_env_3",
      text: {
        en: "Describe your environmental initiatives",
        zu: "Chaza izinyathelo zakho zemvelo",
      },
      type: "text",
      weight: 3,
      categoryId: "cat_env",
      templateId: "sustainability_template",
      order: 3,
    },
    {
      questionId: "q_social_1",
      text: {
        en: "Does your cooperative have a diversity and inclusion policy?",
        zu: "Ingabe umfelandawonye wakho unomgomo wokuhlukahluka nokufakwa?",
      },
      type: "yes_no",
      weight: 6,
      categoryId: "cat_social",
      templateId: "sustainability_template",
      order: 1,
    },
    {
      questionId: "q_gov_1",
      text: {
        en: "Does your cooperative hold regular member meetings?",
        zu: "Ingabe umfelandawonye wakho ubamba imihlangano yamalungu njalo?",
      },
      type: "yes_no",
      weight: 7,
      categoryId: "cat_gov",
      templateId: "sustainability_template",
      order: 1,
    },
    {
      questionId: "q_fin_1",
      text: {
        en: "What percentage of your revenue is profit?",
        zu: "Yini iphesenti lengeniso yakho eyinzuzo?",
      },
      type: "percentage",
      weight: 8,
      categoryId: "cat_fin",
      templateId: "sustainability_template",
      order: 1,
    },
  ];

  for (const question of questions) {
    await dbService.add("questions", question);
  }

  console.log("Demo data initialized successfully");
};
