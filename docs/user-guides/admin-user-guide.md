# Administrator User Guide

## Overview

This guide provides comprehensive instructions for DGRV administrators of the Sustainability Assessment Tool. As an administrator, you'll manage users, configure assessment templates, analyze results, and generate organizational reports.

## Table of Contents

- [Getting Started](#getting-started)
  - [System Requirements](#system-requirements)
  - [Accessing the Admin Interface](#accessing-the-admin-interface)
  - [Admin Dashboard Overview](#admin-dashboard-overview)
- [User Management](#user-management)
  - [Viewing Users](#viewing-users)
  - [Creating New Users](#creating-new-users)
  - [Editing User Details](#editing-user-details)
  - [Assigning Roles](#assigning-roles)
  - [Deactivating Users](#deactivating-users)
- [Organization Management](#organization-management)
  - [Adding Organizations](#adding-organizations)
  - [Managing Organization Details](#managing-organization-details)
  - [Associating Users with Organizations](#associating-users-with-organizations)
- [Assessment Template Management](#assessment-template-management)
  - [Viewing Templates](#viewing-templates)
  - [Creating Templates](#creating-templates)
  - [Editing Templates](#editing-templates)
  - [Question Management](#question-management)
  - [Setting Scoring Rules](#setting-scoring-rules)
- [Reports and Analytics](#reports-and-analytics)
  - [Individual Assessment Reports](#individual-assessment-reports)
  - [Organizational Reports](#organizational-reports)
  - [Aggregate Analytics](#aggregate-analytics)
  - [Exporting Data](#exporting-data)
- [System Configuration](#system-configuration)
  - [Email Notifications](#email-notifications)
  - [Language Settings](#language-settings)
  - [System Parameters](#system-parameters)
- [Security Management](#security-management)
  - [Access Control](#access-control)
  - [Audit Logs](#audit-logs)
- [Troubleshooting](#troubleshooting)
- [Support Resources](#support-resources)

## Getting Started

### System Requirements

- **Web Browser**: Chrome, Firefox, Safari, or Edge (latest versions recommended)
- **Internet Connection**: High-speed connection recommended for optimal performance
- **Screen Resolution**: Minimum 1920x1080 for best experience

### Accessing the Admin Interface

1. Open your web browser
2. Navigate to the admin interface URL (typically https://ec2-16-171-203-85.eu-north-1.compute.amazonaws.com/admin/dashboard)
3. For local development environment, use http://localhost:5173
4. Enter your administrator credentials (email and password)
5. If using SSO, click the "Single Sign-On" button and follow your organization's login process

### Admin Dashboard Overview

After login, you'll see the administrator dashboard containing:

- **Summary Statistics**: Number of users, organizations, completed assessments, etc.
- **Recent Activity**: Latest user registrations, assessment submissions, and system events
- **Quick Access**: Shortcuts to commonly used functions
- **System Status**: Overview of system health and notifications
- **Pending Approvals**: User registrations or assessment submissions requiring admin attention

## User Management

### Viewing Users

1. Navigate to Users → View All Users
2. The user list displays name, email, organization, role, and status
3. Use filters to search by name, email, organization, role, or status
4. Sort the list by clicking on column headers
5. Adjust the number of users displayed per page

### Creating New Users

1. Navigate to Users → Add New User
2. Complete the user form with required information:
   - Full name
   - Email address (will be their username)
   - Organization association
   - Role assignment
   - Contact information
3. Select whether to send an email invitation
4. Click "Create User"
5. The system will generate a temporary password if email notifications are enabled

### Editing User Details

1. Locate the user in the user list
2. Click the "Edit" button in the actions column
3. Update any user details as needed
4. Click "Save Changes"

### Assigning Roles

The system has the following predefined roles:

- **DGRV_Admin**: Full system access (reserved for DGRV administrators)
- **Org_Admin**: Organization-level administration capabilities
- **Org_User**: Standard user who can complete assessments
- **Org_Expert**: Subject matter expert with additional analysis permissions

To assign or change roles:

1. Navigate to Users → View All Users
2. Find the user and click "Edit"
3. In the Roles section, check or uncheck roles
4. Click "Save Changes"

### Deactivating Users

1. Navigate to Users → View All Users
2. Find the user to deactivate
3. Click the "Deactivate" button in the actions column
4. Confirm the deactivation

**Note**: Deactivated users can't log in, but their data remains in the system. You can reactivate them later if needed.

## Organization Management

### Adding Organizations

1. Navigate to Organizations → Add New Organization
2. Complete the organization form:
   - Organization name
   - Type (Cooperative, Association, etc.)
   - Country and region
   - Address information
   - Contact details
   - Registration number
   - Organization size
3. Upload organization logo (optional)
4. Click "Create Organization"

### Managing Organization Details

1. Navigate to Organizations → View All Organizations
2. Find the organization to edit
3. Click the "Edit" button
4. Update organization details as needed
5. Click "Save Changes"

### Associating Users with Organizations

1. Navigate to Organizations → View Organization
2. Select the organization
3. Go to the "Users" tab
4. Click "Add User to Organization"
5. Either select an existing user or create a new one
6. Assign appropriate organizational roles
7. Click "Add User"

## Assessment Template Management

### Viewing Templates

1. Navigate to Templates → View All Templates
2. The list shows template name, description, status, and last modified date
3. Click on a template name to view details

### Creating Templates

1. Navigate to Templates → Create New Template
2. Enter template details:
   - Template name
   - Description
   - Applicable organization types
   - Validity period
3. Click "Create Template" to proceed to question configuration

### Editing Templates

1. Navigate to Templates → View All Templates
2. Find the template to edit
3. Click the "Edit" button
4. Make necessary changes
5. Click "Save Template"

**Note**: Editing a template won't affect already completed assessments.

### Question Management

1. Navigate to Templates → Edit Template
2. Go to the "Questions" tab
3. Organize questions into sections and categories
4. For each question, define:
   - Question text (supports multilingual entries)
   - Question type (multiple choice, checkbox, text, number, etc.)
   - Available options (for multiple choice questions)
   - Help text for users
   - Required status
   - Validation rules
5. Set the question order using drag-and-drop
6. Click "Save Questions"

### Setting Scoring Rules

1. Navigate to Templates → Edit Template
2. Go to the "Scoring" tab
3. Define scoring rules for each question:
   - Points assigned to each answer option
   - Question weight within its section
4. Set section weights for the overall assessment score
5. Define score thresholds and interpretations
6. Click "Save Scoring Rules"

## Reports and Analytics

### Individual Assessment Reports

1. Navigate to Reports → Assessment Reports
2. Filter by organization, template, or date range
3. Click on an assessment to view its detailed report
4. The report includes:
   - Overall score and section scores
   - Question-by-question breakdown
   - Strengths and improvement areas
   - Comparative analysis with benchmarks
5. Use the "Export" button to download the report in PDF, Excel, or CSV format

### Organizational Reports

1. Navigate to Reports → Organization Reports
2. Select the organization
3. View aggregated data across multiple assessments
4. Analyze trends over time
5. Compare against industry benchmarks
6. Export reports in multiple formats

### Aggregate Analytics

1. Navigate to Analytics → Dashboard
2. View system-wide analytics including:
   - Assessment completion rates
   - Average scores by region, organization type, or size
   - Trend analysis over time
   - Comparative performance metrics
3. Use filters to refine the analysis
4. Interact with charts to drill down into specific data points

### Exporting Data

1. From any report view, click the "Export" button
2. Select the export format (PDF, Excel, CSV, or JSON)
3. Choose what data to include
4. Define any specific export parameters
5. Click "Generate Export"
6. Download the file when processing is complete

## System Configuration

### Email Notifications

1. Navigate to Settings → Notifications
2. Configure email templates for:
   - User registration
   - Password reset
   - Assessment submission
   - Report generation
   - System alerts
3. Set notification triggers and recipients
4. Preview and test email templates
5. Save configuration changes

### Language Settings

1. Navigate to Settings → Languages
2. Manage available languages in the system
3. Set the default language
4. Configure translation files for templates and questions
5. Preview interface in different languages

### System Parameters

1. Navigate to Settings → System Parameters
2. Configure global settings like:
   - Session timeout duration
   - Password policy
   - File upload limits
   - API access controls
   - Backup frequency
3. Save parameter changes

## Security Management

### Access Control

1. Navigate to Security → Access Control
2. Review and modify role permissions
3. Set IP restrictions if needed
4. Configure two-factor authentication requirements
5. Manage API keys and access tokens

### Audit Logs

1. Navigate to Security → Audit Logs
2. View system activity including:
   - User logins and logouts
   - Configuration changes
   - User management actions
   - Assessment submissions and modifications
3. Filter logs by user, action type, date range, or IP address
4. Export audit logs for compliance reporting

## Troubleshooting

### Common Admin Issues

#### User Cannot Log In
- Verify user account is active
- Check email address spelling
- Reset their password if necessary
- Verify they're using the correct login URL

#### Template Issues
- Check for duplicate questions
- Verify scoring rules add up correctly
- Test the template in preview mode
- Check for language translation issues

#### Report Generation Failures
- Verify assessment is complete
- Check database connectivity
- Ensure template scoring rules are complete
- Try regenerating the report

#### System Performance
- Monitor database size and growth
- Check server resource usage
- Review active user sessions
- Consider scheduling maintenance during off-hours

## Support Resources

### Administrator Support

For issues not covered in this guide:

1. Email the technical support team at admin-support@example.com
2. Include detailed information about the issue
3. Attach screenshots if applicable
4. Note any error messages received

### Documentation and Training

- Access comprehensive system documentation in the Admin Help Center
- Schedule additional administrator training by contacting the training team
- View recorded webinars and tutorials in the Admin Learning Portal
- Participate in the administrator community forum to share best practices

### System Updates

- Subscribe to the system newsletter for updates
- Review release notes before each system update
- Test new features in the staging environment when available
- Provide feedback for future improvements
