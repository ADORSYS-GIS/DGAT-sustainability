// import React, { useState, useEffect } from "react";
// import { Navbar } from "@/components/shared/Navbar";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Organization } from "@/services/indexedDB";
// import {
//   createOrganization,
//   updateOrganization,
//   deleteOrganization,
//   getAllOrganizations,
// } from "@/services/dataService";
// import { Building2, Plus, Edit, Trash2, MapPin, Mail } from "lucide-react";

// export const ManageOrganizations: React.FC = () => {
//   const { toast } = useToast();
//   const [organizations, setOrganizations] = useState<Organization[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showAddDialog, setShowAddDialog] = useState(false);
//   const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
//   const [formData, setFormData] = useState({
//     name: "",
//     location: "",
//     contactEmail: "",
//     description: "",
//   });

//   useEffect(() => {
//     loadOrganizations();
//   }, []);

//   const loadOrganizations = async () => {
//     try {
//       const orgs = await getAllOrganizations();
//       setOrganizations(orgs);
//     } catch (error) {
//       console.error("Error loading organizations:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!formData.name.trim() || !formData.contactEmail.trim()) {
//       toast({
//         title: "Error",
//         description: "Name and contact email are required",
//         variant: "destructive",
//       });
//       return;
//     }

//     try {
//       if (editingOrg) {
//         const updatedOrg: Organization = {
//           ...editingOrg,
//           ...formData,
//         };
//         await updateOrganization(updatedOrg);
//         setOrganizations((prev) =>
//           prev.map((org) =>
//             org.organizationId === editingOrg.organizationId ? updatedOrg : org,
//           ),
//         );
//         toast({
//           title: "Success",
//           description: "Organization updated successfully",
//           className: "bg-dgrv-green text-white",
//         });
//       } else {
//         const newOrg = await createOrganization(formData);
//         setOrganizations((prev) => [...prev, newOrg]);
//         toast({
//           title: "Success",
//           description: "Organization created successfully",
//           className: "bg-dgrv-green text-white",
//         });
//       }

//       resetForm();
//     } catch (error) {
//       console.error("Error saving organization:", error);
//       toast({
//         title: "Error",
//         description: "Failed to save organization",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleEdit = (org: Organization) => {
//     setEditingOrg(org);
//     setFormData({
//       name: org.name,
//       location: org.location,
//       contactEmail: org.contactEmail,
//       description: org.description,
//     });
//     setShowAddDialog(true);
//   };

//   const handleDelete = async (orgId: string) => {
//     if (!confirm("Are you sure you want to delete this organization?")) return;

//     try {
//       await deleteOrganization(orgId);
//       setOrganizations((prev) =>
//         prev.filter((org) => org.organizationId !== orgId),
//       );
//       toast({
//         title: "Success",
//         description: "Organization deleted successfully",
//         className: "bg-dgrv-green text-white",
//       });
//     } catch (error) {
//       console.error("Error deleting organization:", error);
//       toast({
//         title: "Error",
//         description: "Failed to delete organization",
//         variant: "destructive",
//       });
//     }
//   };

//   const resetForm = () => {
//     setFormData({ name: "", location: "", contactEmail: "", description: "" });
//     setEditingOrg(null);
//     setShowAddDialog(false);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50">
//         <Navbar />
//         <div className="pt-20 pb-8 flex items-center justify-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Navbar />

//       <div className="pt-20 pb-8">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           {/* Header */}
//           <div className="mb-8 animate-fade-in">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="flex items-center space-x-3 mb-4">
//                   <Building2 className="w-8 h-8 text-dgrv-blue" />
//                   <h1 className="text-3xl font-bold text-dgrv-blue">
//                     Manage Organizations
//                   </h1>
//                 </div>
//                 <p className="text-lg text-gray-600">
//                   Add and manage cooperative organizations
//                 </p>
//               </div>

//               <Dialog
//                 open={showAddDialog}
//                 onOpenChange={(open) => {
//                   if (!open) resetForm();
//                   setShowAddDialog(open);
//                 }}
//               >
//                 <DialogTrigger asChild>
//                   <Button className="bg-dgrv-green hover:bg-green-700">
//                     <Plus className="w-4 h-4 mr-2" />
//                     Add Organization
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>
//                       {editingOrg
//                         ? "Edit Organization"
//                         : "Add New Organization"}
//                     </DialogTitle>
//                   </DialogHeader>
//                   <div className="space-y-4">
//                     <div>
//                       <Label htmlFor="name">Organization Name</Label>
//                       <Input
//                         id="name"
//                         value={formData.name}
//                         onChange={(e) =>
//                           setFormData((prev) => ({
//                             ...prev,
//                             name: e.target.value,
//                           }))
//                         }
//                         placeholder="Enter organization name"
//                       />
//                     </div>
//                     <div>
//                       <Label htmlFor="location">Location</Label>
//                       <Input
//                         id="location"
//                         value={formData.location}
//                         onChange={(e) =>
//                           setFormData((prev) => ({
//                             ...prev,
//                             location: e.target.value,
//                           }))
//                         }
//                         placeholder="Enter location"
//                       />
//                     </div>
//                     <div>
//                       <Label htmlFor="contactEmail">Contact Email</Label>
//                       <Input
//                         id="contactEmail"
//                         type="email"
//                         value={formData.contactEmail}
//                         onChange={(e) =>
//                           setFormData((prev) => ({
//                             ...prev,
//                             contactEmail: e.target.value,
//                           }))
//                         }
//                         placeholder="Enter contact email"
//                       />
//                     </div>
//                     <div>
//                       <Label htmlFor="description">Description</Label>
//                       <Textarea
//                         id="description"
//                         value={formData.description}
//                         onChange={(e) =>
//                           setFormData((prev) => ({
//                             ...prev,
//                             description: e.target.value,
//                           }))
//                         }
//                         placeholder="Enter organization description"
//                       />
//                     </div>
//                     <div className="flex space-x-2 pt-4">
//                       <Button
//                         onClick={handleSubmit}
//                         className="bg-dgrv-green hover:bg-green-700"
//                       >
//                         {editingOrg ? "Update" : "Create"} Organization
//                       </Button>
//                       <Button variant="outline" onClick={resetForm}>
//                         Cancel
//                       </Button>
//                     </div>
//                   </div>
//                 </DialogContent>
//               </Dialog>
//             </div>
//           </div>

//           {/* Organizations Grid */}
//           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
//             {organizations.map((org, index) => (
//               <Card
//                 key={org.organizationId}
//                 className="animate-fade-in hover:shadow-lg transition-shadow"
//                 style={{ animationDelay: `${index * 100}ms` }}
//               >
//                 <CardHeader>
//                   <CardTitle className="flex items-center space-x-3">
//                     <div className="p-2 rounded-full bg-dgrv-blue/10">
//                       <Building2 className="w-5 h-5 text-dgrv-blue" />
//                     </div>
//                     <span className="text-lg">{org.name}</span>
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-3">
//                     <div className="flex items-center space-x-2 text-sm text-gray-600">
//                       <MapPin className="w-4 h-4" />
//                       <span>{org.location}</span>
//                     </div>
//                     <div className="flex items-center space-x-2 text-sm text-gray-600">
//                       <Mail className="w-4 h-4" />
//                       <span>{org.contactEmail}</span>
//                     </div>
//                     {org.description && (
//                       <p className="text-sm text-gray-600">{org.description}</p>
//                     )}
//                     <div className="flex space-x-2 pt-4">
//                       <Button
//                         size="sm"
//                         variant="outline"
//                         onClick={() => handleEdit(org)}
//                         className="flex-1"
//                       >
//                         <Edit className="w-4 h-4 mr-1" />
//                         Edit
//                       </Button>
//                       <Button
//                         size="sm"
//                         variant="outline"
//                         onClick={() => handleDelete(org.organizationId)}
//                         className="text-red-600 hover:bg-red-50"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </Button>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}

//             {organizations.length === 0 && (
//               <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
//                 <CardContent>
//                   <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
//                   <h3 className="text-lg font-medium text-gray-900 mb-2">
//                     No organizations yet
//                   </h3>
//                   <p className="text-gray-600 mb-6">
//                     Add your first cooperative organization to get started.
//                   </p>
//                   <Button
//                     onClick={() => setShowAddDialog(true)}
//                     className="bg-dgrv-green hover:bg-green-700"
//                   >
//                     Add First Organization
//                   </Button>
//                 </CardContent>
//               </Card>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };