import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  User, 
  LogOut, 
  Loader2,
  Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import UserModelForm from "@/components/user-models/UserModelForm";
import { 
  UserModel, 
  getUserModels, 
  createUserModel, 
  updateUserModel, 
  deleteUserModel,
  setDefaultUserModel
} from "@/services/userModelService";

const UserModelsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userModels, setUserModels] = useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<UserModel | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    
    loadUserModels();
  }, [user, navigate]);

  const loadUserModels = async () => {
    setIsLoading(true);
    try {
      const models = await getUserModels();
      setUserModels(models);
    } catch (error) {
      console.error("Error loading user models:", error);
      toast({
        title: "Error",
        description: "Failed to load your models",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateModel = async (model: UserModel) => {
    setIsSubmitting(true);
    try {
      await createUserModel(model);
      toast({
        title: "Model created",
        description: "Your research model has been created successfully",
      });
      setIsCreateModalOpen(false);
      await loadUserModels();
    } catch (error) {
      console.error("Error creating model:", error);
      toast({
        title: "Error",
        description: "Failed to create model",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateModel = async (model: UserModel) => {
    if (!selectedModel?.id) return;
    
    setIsSubmitting(true);
    try {
      await updateUserModel(selectedModel.id, model);
      toast({
        title: "Model updated",
        description: "Your research model has been updated successfully",
      });
      setIsEditModalOpen(false);
      setSelectedModel(null);
      await loadUserModels();
    } catch (error) {
      console.error("Error updating model:", error);
      toast({
        title: "Error",
        description: "Failed to update model",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      await deleteUserModel(id);
      toast({
        title: "Model deleted",
        description: "Your research model has been deleted",
      });
      await loadUserModels();
    } catch (error) {
      console.error("Error deleting model:", error);
      toast({
        title: "Error",
        description: "Failed to delete model",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultUserModel(id);
      toast({
        title: "Default model set",
        description: "This model will be used by default in your research",
      });
      await loadUserModels();
    } catch (error) {
      console.error("Error setting default model:", error);
      toast({
        title: "Error",
        description: "Failed to set default model",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600"></div>
          <a href="/" className="no-underline">
            <span className="font-display font-semibold text-xl">deep research</span>
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/research")}
            className="flex items-center gap-1"
          >
            <Brain className="h-4 w-4" />
            research
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            profile
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            logout
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 container max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Your Research Models</h1>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                New Model
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Research Model</DialogTitle>
                <DialogDescription>
                  Define a research model that matches your expertise and interests
                </DialogDescription>
              </DialogHeader>
              <UserModelForm 
                onSubmit={handleCreateModel}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-muted-foreground mb-6">
          Create and customize research models to personalize your research experience.
          Each model includes your domain, expertise level, and preferred sources.
        </p>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : userModels.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/50">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-medium">No models yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create your first research model to tailor your research experience
                  to your specific domain and expertise.
                </p>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Model
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userModels.map((model) => (
              <Card key={model.id} className={model.is_default ? "border-primary border-2" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center">
                        {model.name}
                        {model.is_default && (
                          <Badge variant="outline" className="ml-2 text-primary border-primary">
                            <Star className="h-3 w-3 mr-1 fill-primary" />
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{model.name}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Research Depth</span>
                        <span className="text-sm">{model.research_depth}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Cognitive Style</span>
                        <span className="text-sm">{model.cognitive_style}</span>
                      </div>
                    </div>
                    
                    {model.included_sources && model.included_sources.length > 0 && (
                      <div>
                        <span className="text-sm font-medium block mb-1">
                          Trusted Sources ({model.included_sources.length})
                        </span>
                        <div className="text-sm text-muted-foreground mt-1">
                          {model.included_sources.slice(0, 2).map((source, index) => (
                            <div key={index} className="truncate">{source}</div>
                          ))}
                          {model.included_sources.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{model.included_sources.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedModel(model);
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the "{model.name}" model.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => model.id && handleDeleteModel(model.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  {!model.is_default && model.id && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSetDefault(model.id!)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Set as Default
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Research Model</DialogTitle>
            <DialogDescription>
              Update your research model settings
            </DialogDescription>
          </DialogHeader>
          {selectedModel && (
            <UserModelForm 
              initialData={selectedModel}
              onSubmit={handleUpdateModel}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserModelsPage;
