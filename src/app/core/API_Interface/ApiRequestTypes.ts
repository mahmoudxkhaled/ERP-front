export enum ApiRequestTypes {

  // (1) ERP System-Level (codes 100 - 999)

  // (1A) Account and Session Management (codes 100 - 199)
  // Actions by the user (codes 100 - 149)
  Login = 100,
  Verify_2FA = 101,
  Logout = 102,
  Set_2FA = 103,
  Change_Password = 104,
  Reset_Password_Request = 105,
  Reset_Password_Confirm = 106,
  Verify_Email = 107,
  Get_Login_Data_Package = 110,
  // Actions by the ERP and Entity Administrators (codes 150 - 199)
  Create_Account = 150,
  Activate_Account = 151,
  Deactivate_Account = 152,
  Delete_Account = 153,
  Get_Account_Status = 154,

  // (1B) Users and Profiles Management (codes 200 - 399)

  // (1C) Entity and Organization Management (codes 400 - 599)
  // Entity Management (codes 201 - 207)
  Create_Entity = 201,
  Update_Entity = 202,
  Get_Entity = 203,
  List_Entities = 204,
  Deactivate_Entity = 205,
  Activate_Entity = 206,
  Assign_Entity_Admin = 207

  // (1D) Roles and Access Control (codes 600 - 699)

  // (1E) Settings and Configurations(codes 700 - 799)

  // (1F) Actions and Notifications(codes 800 - 999)


  //	(2) Timesheets Module (codes 1000 - 1999)



}
