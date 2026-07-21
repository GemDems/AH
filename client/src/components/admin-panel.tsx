import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lock, Shield, Eye, EyeOff, Plus, Trash2, Upload, Image, FileText, Globe, Calendar, ExternalLink, Clock, CheckCircle, XCircle, MessageSquare, Bot, MailOpen } from "lucide-react";
import type { InsertAffiliateLink, AffiliateLink, UserIdea } from "@shared/schema";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminPanel({ isOpen, onClose, onSuccess }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "drafts" | "manage" | "ideas" | "messages">("create");
  const [msgAiReplies, setMsgAiReplies] = useState<Record<number, string>>({});
  const [formData, setFormData] = useState<InsertAffiliateLink & { isVerified?: boolean; isDraft?: boolean; scheduledPublishAt?: Date; scheduledDeleteAt?: Date; categories?: string[] }>({
    title: "",
    url: "",
    description: "",
    category: "Hot Deals",
    categories: ["Hot Deals"],
    imageUrl: "",
    imageUrls: [],
    price: "",
    isVerified: false,
    isDraft: false,
    scheduledPublishAt: undefined,
    scheduledDeleteAt: undefined,
    aiPrivateInfo: "",
  });

  const [schedulingProduct, setSchedulingProduct] = useState<{ id: number; title: string; type: 'publish' | 'delete' } | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all products and drafts for management
  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/admin/affiliate-links"],
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ["/api/admin/drafts"],
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  // Fetch user ideas — polls every 5s so any device submission appears instantly
  const { data: userIdeas = [], refetch: refetchIdeas } = useQuery<UserIdea[]>({
    queryKey: ["/api/admin/user-ideas"],
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  // Fetch contact messages — polls every 5s so messages from any tab/device show up
  const { data: contactMsgs = [], refetch: refetchMsgs } = useQuery<any[]>({
    queryKey: ["/api/contact/messages"],
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const MSG_KEYWORDS: { keywords: string[]; response: string; unresolvable?: boolean }[] = [
    { keywords: ["refund","money back","return","reimburse"], response: "We understand your concern. For refund requests, please ask the customer to email elitedeals.edh@gmail.com with their order details and device reference.", unresolvable: true },
    { keywords: ["scam","fake","fraud","not real"], response: "Thank you for reporting this. We're investigating immediately. Please ask the customer to email elitedeals.edh@gmail.com with full details and their device reference.", unresolvable: true },
    { keywords: ["broken","error","bug","not working","issue","problem","glitch"], response: "Thanks for flagging this! We're looking into the technical issue. Please ask the customer to clear their cache and try again. If it persists, email elitedeals.edh@gmail.com with their device info." },
    { keywords: ["cancel","unsubscribe","stop","remove"], response: "No action needed on your end — there are no subscriptions on the platform. If the customer has a specific account concern, ask them to email elitedeals.edh@gmail.com." },
    { keywords: ["help","how","what","where","explain"], response: "Auto-reply sent to customer with how-to information. If they need further help, they can use the AI chatbot on the main page or email elitedeals.edh@gmail.com." },
  ];

  function generateAiReply(message: string, deviceId?: string): string {
    const lower = (message || "").toLowerCase();
    for (const entry of MSG_KEYWORDS) {
      if (entry.keywords.some(k => lower.includes(k))) {
        const deviceRef = deviceId ? ` (Device ref: ...${deviceId.slice(-8)})` : "";
        if (entry.unresolvable) {
          return `${entry.response}${deviceRef} — ask them to mention this device reference in their email so you can identify their account.`;
        }
        return entry.response;
      }
    }
    const deviceRef = deviceId ? `...${deviceId.slice(-8)}` : "unknown";
    return `Message received from device ref ${deviceRef}. This appears to be a general enquiry. If it needs a personal response, ask the customer to email elitedeals.edh@gmail.com with reference to their device (${deviceRef}).`;
  }

  const addImageField = () => {
    setAdditionalImages([...additionalImages, ""]);
  };

  const removeImageField = (index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };

  const updateImageField = (index: number, value: string) => {
    const updated = [...additionalImages];
    updated[index] = value;
    setAdditionalImages(updated);
  };

  const convertFileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const dataURL = await convertFileToDataURL(file);
        setFormData({ ...formData, imageUrl: dataURL });
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to process the image",
          variant: "destructive",
        });
      }
    }
  };

  const handleAdditionalImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const dataURL = await convertFileToDataURL(file);
        updateImageField(index, dataURL);
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to process the image",
          variant: "destructive",
        });
      }
    }
  };

  // Publish draft mutation
  const publishDraftMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/admin/publish/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      toast({
        title: "Draft Published",
        description: "Product is now live on the site",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to publish draft",
        variant: "destructive",
      });
    },
  });

  // Publish all drafts mutation
  const publishAllDraftsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/publish-all");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      toast({
        title: "All Drafts Published",
        description: `${data.published} products are now live on the site`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to publish all drafts",
        variant: "destructive",
      });
    },
  });

  // Schedule deletion mutation
  const scheduleDeleteMutation = useMutation({
    mutationFn: async ({ id, scheduledDeleteAt }: { id: number; scheduledDeleteAt: Date | null }) => {
      return await apiRequest("PUT", `/api/admin/schedule-delete/${id}`, { scheduledDeleteAt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      setSchedulingProduct(null);
      setScheduleDate("");
      toast({
        title: "Deletion Scheduled",
        description: "Product will be automatically deleted at the scheduled time",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule deletion",
        variant: "destructive",
      });
    },
  });

  // Schedule publishing mutation
  const schedulePublishMutation = useMutation({
    mutationFn: async ({ id, scheduledPublishAt }: { id: number; scheduledPublishAt: Date | null }) => {
      return await apiRequest("PUT", `/api/admin/schedule-publish/${id}`, { scheduledPublishAt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drafts"] });
      setSchedulingProduct(null);
      setScheduleDate("");
      toast({
        title: "Publishing Scheduled",
        description: "Draft will be automatically published at the scheduled time",
      });
    },
    onError: (error) => {
      console.error("Schedule publish error:", error);
      toast({
        title: "Error",
        description: "Failed to schedule publishing",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/affiliate-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      toast({
        title: "Product Removed",
        description: "Product has been permanently deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove product",
        variant: "destructive",
      });
    },
  });

  // Toggle verified badge on a product
  const toggleVerifyMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PUT", `/api/admin/affiliate-links/${id}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      toast({
        title: "Verified Badge Updated",
        description: "Product verification status changed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update verification",
        variant: "destructive",
      });
    },
  });
  
  const ADMIN_PASSWORD = "9f$81r@V7#iwant";
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword("");
      toast({
        title: "Access Granted",
        description: "Welcome to Creator Mode",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      });
      setPassword("");
    }
  };
  
  const handleClose = () => {
    setIsAuthenticated(false);
    setPassword("");
    setActiveTab("create");
    resetForm();
    onClose();
  };

  const createLinkMutation = useMutation({
    mutationFn: async (data: InsertAffiliateLink) => {
      return await apiRequest("POST", "/api/affiliate-links", data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drafts"] });
      
      const isDraft = variables.isDraft;
      toast({
        title: "Success!",
        description: isDraft ? "Draft saved successfully" : "Product published successfully",
      });
      
      resetForm();
      if (!isDraft) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Create link error:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    
    if (!formData.title || !formData.url || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    // Image URL validation (if provided) - skip validation for data URLs (uploaded images)
    if (formData.imageUrl && formData.imageUrl.trim() && !formData.imageUrl.startsWith('data:')) {
      try {
        new URL(formData.imageUrl);
      } catch {
        toast({
          title: "Invalid Image URL",
          description: "Please enter a valid image URL",
          variant: "destructive",
        });
        return;
      }
    }

    // Additional images validation
    for (let i = 0; i < additionalImages.length; i++) {
      const imageUrl = additionalImages[i];
      if (imageUrl && imageUrl.trim() && !imageUrl.startsWith('data:')) {
        try {
          new URL(imageUrl);
        } catch {
          toast({
            title: "Invalid Image URL",
            description: `Please enter a valid URL for additional image ${i + 1}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Combine all images into imageUrls array for submission
    const allImageUrls = [formData.imageUrl, ...additionalImages].filter(url => url && url.trim());
    const cats = formData.categories && formData.categories.length > 0 ? formData.categories : [formData.category];
    const primaryCategory = cats.includes("Hot Deals") ? "Hot Deals" : cats[0];
    const submissionData = {
      ...formData,
      category: primaryCategory,
      categories: cats,
      imageUrls: allImageUrls.length > 0 ? allImageUrls : undefined,
      isDraft: isDraft,
      // Convert boolean values to integers for database compatibility
      isVerified: formData.isVerified ? 1 : 0,
      isElitePick: formData.isElitePick ? 1 : 0,
      stock: formData.stock || 0,
      aiPrivateInfo: formData.aiPrivateInfo || null
    };
    createLinkMutation.mutate(submissionData);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      url: "",
      description: "",
      category: "Hot Deals",
      categories: ["Hot Deals"],
      imageUrl: "",
      imageUrls: [],
      price: "",
      isVerified: false,
      isDraft: false,
      scheduledPublishAt: undefined,
      scheduledDeleteAt: undefined,
      aiPrivateInfo: "",
    });
    setAdditionalImages([]);
  };



  const renderProductCard = (product: AffiliateLink, isDraft = false) => (
    <Card key={product.id} className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{product.title}</CardTitle>
            <CardDescription>{product.category}</CardDescription>
          </div>
          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button
                  size="sm"
                  onClick={() => publishDraftMutation.mutate(product.id)}
                  disabled={publishDraftMutation.isPending}
                >
                  <Globe className="w-4 h-4 mr-1" />
                  Publish Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSchedulingProduct({ id: product.id, title: product.title, type: 'publish' })}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Schedule Publish
                </Button>
              </>
            )}
            {!isDraft && (
              <>
                {/* Verify / Unverify toggle — adds ultimate trust badge to live product */}
                <Button
                  size="sm"
                  variant={product.isVerified ? "outline" : "default"}
                  onClick={() => toggleVerifyMutation.mutate(product.id)}
                  disabled={toggleVerifyMutation.isPending}
                  className={product.isVerified
                    ? "border-amber-500 text-amber-700 hover:bg-amber-50"
                    : "bg-gradient-to-r from-blue-700 to-blue-900 text-white hover:from-blue-800 hover:to-blue-950"
                  }
                  title={product.isVerified ? "Remove verified badge" : "Add verified badge to this product"}
                >
                  {product.isVerified
                    ? <><XCircle className="w-4 h-4 mr-1" /> Unverify</>
                    : <><CheckCircle className="w-4 h-4 mr-1" /> Verify</>
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSchedulingProduct({ id: product.id, title: product.title, type: 'delete' })}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Schedule Delete
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteProductMutation.mutate(product.id)}
              disabled={deleteProductMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{product.description}</p>
          <div className="flex gap-2">
            {product.price && (
              <Badge variant="outline">{product.price}</Badge>
            )}
            {product.isVerified ? (
              <Badge variant="secondary">Verified</Badge>
            ) : null}
            {product.clicks > 0 && (
              <Badge variant="outline">{product.clicks} clicks</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            Created: {new Date(product.createdAt).toLocaleDateString()}
          </div>
          {product.scheduledPublishAt && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="w-4 h-4" />
              Scheduled for publishing: {new Date(product.scheduledPublishAt).toLocaleDateString()} at {new Date(product.scheduledPublishAt).toLocaleTimeString()}
            </div>
          )}
          {product.scheduledDeleteAt && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <Clock className="w-4 h-4" />
              Scheduled for deletion: {new Date(product.scheduledDeleteAt).toLocaleDateString()} at {new Date(product.scheduledDeleteAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-conversion-blue" />
              {isAuthenticated ? "Creator Mode Dashboard" : "Creator Authentication Required"}
            </DialogTitle>
          </DialogHeader>

        {!isAuthenticated ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="text-center py-4">
              <Lock className="w-12 h-12 text-conversion-blue mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Enter your creator password to access the admin panel
              </p>
            </div>
            
            <div className="relative">
              <Label htmlFor="password">Creator Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 bg-conversion-blue hover:bg-blue-700"
              >
                <Shield className="w-4 h-4 mr-2" />
                Authenticate
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
              <TabsTrigger value="ideas">Ideas ({userIdeas.length})</TabsTrigger>
              <TabsTrigger value="messages" className="relative">
                Messages
                {contactMsgs.filter((m: any) => !m.isResolved).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {contactMsgs.filter((m: any) => !m.isResolved).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Product</CardTitle>
                  <CardDescription>Add a new affiliate link to your site</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          <div>
            <Label htmlFor="title">Link Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Amazing Product Deal"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="url">Affiliate URL *</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://amazon.com/product-link"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <div className="space-y-2">
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Limited time offer - 50% off!"
                rows={3}
                className="mt-1"
              />
              
              {/* AI Description Editor - 1000% Conversion Optimizer */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (!formData.description.trim()) {
                      toast({
                        title: "Enter Description First",
                        description: "Please add some description text before enhancement",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // BATMAN-LEVEL AI: Generate ultra-precise 6-13 word descriptions with maximum power
                    let originalText = formData.description.trim().toLowerCase();
                    
                    // Fix grammar first
                    let cleanText = formData.description.trim()
                      .replace(/\bi\b/g, 'I')
                      .replace(/\s+/g, ' ')
                      .replace(/([.!?])\s*([a-z])/g, (match, punct, letter) => punct + ' ' + letter.toUpperCase())
                      .replace(/^([a-z])/, (match) => match.toUpperCase())
                      .replace(/\b(teh|hte)\b/gi, 'the')
                      .replace(/\b(adn|nad)\b/gi, 'and')
                      .replace(/\b(taht|thta)\b/gi, 'that')
                      .replace(/\b(youer|yuor)\b/gi, 'your')
                      .replace(/\b(compatable)\b/gi, 'compatible')
                      .replace(/\b(usefull)\b/gi, 'useful');
                    
                    // Generate unique seed for ultra-precise descriptions
                    const seed = (formData.title + formData.category + originalText).length % 12;
                    
                    // 12 ULTRA-PRECISE AI DESCRIPTION TEMPLATES (shorter is better, max 6-13)
                    const aiTemplates = [
                      (text) => `Premium ${text} engineered for exceptional performance.`,
                      (text) => `Advanced ${text} designed to exceed expectations.`,
                      (text) => `Professional-grade ${text} built for superior results.`,
                      (text) => `High-performance ${text} crafted with precision engineering.`,
                      (text) => `Superior ${text} featuring innovative design standards.`,
                      (text) => `Elite-quality ${text} delivering consistent results.`,
                      (text) => `Precision-crafted ${text} engineered for reliability.`,
                      (text) => `Professional ${text} built to industry standards.`,
                      (text) => `Advanced ${text} featuring premium construction.`,
                      (text) => `High-grade ${text} designed for optimal performance.`,
                      (text) => `Superior-quality ${text} engineered with precision.`,
                      (text) => `Premium ${text} delivering exceptional results.`
                    ];
                    
                    // Extract key product type/category
                    const productType = formData.category.toLowerCase() === 'hot deals' ? 
                      (cleanText.split(' ')[0] || 'product') : 
                      formData.category.toLowerCase();
                    
                    // Apply template based on seed
                    let enhanced = aiTemplates[seed](productType);
                    
                    // Count words and enforce maximum limit (shorter is better)
                    const words = enhanced.split(/\s+/);
                    if (words.length > 13) {
                      enhanced = words.slice(0, 13).join(' ');
                    }
                    // No minimum - shorter is better!
                    
                    setFormData({ ...formData, description: enhanced });
                    toast({
                      title: "BATMAN-LEVEL PRECISION ACTIVATED!",
                      description: `${enhanced.split(' ').length} words • Shorter = more powerful • Maximum impact • Perfect chatbot understanding`,
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-blue-600 text-white border-none hover:from-purple-600 hover:to-blue-700 font-medium"
                >
                  <span className="mr-1">⚡</span>
                  AI MAXIMIZE (Shorter Better)
                </Button>
                
                <div className="text-xs text-gray-600 self-center">
                  <span className="font-semibold text-purple-600">Batman-level precision</span> • Minimalistic • Powerful • Subconscious triggers
                </div>
              </div>
              
              <p className="text-xs text-purple-600 font-medium">
                🧠 AI will transform your info into ultra-precise descriptions (shorter is better, max 13 words) for perfect chatbot understanding
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="aiPrivateInfo">AI Assistant Info (Private)</Label>
            <div className="space-y-2">
              <Textarea
                id="aiPrivateInfo"
                value={formData.aiPrivateInfo || ""}
                onChange={(e) => setFormData({ ...formData, aiPrivateInfo: e.target.value })}
                placeholder="Additional details for AI: specific features, compatibility, technical specs, target audience, unique selling points..."
                rows={3}
                className="mt-1 border-orange-200 bg-orange-50/30"
              />
              
              {/* AI Enhancement Button for AI Assistant Info - EXACT DUPLICATE */}
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  onClick={() => {
                    if (!formData.aiPrivateInfo?.trim()) {
                      toast({
                        title: "Enter AI Info First",
                        description: "Please add some AI assistant information before enhancement",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // BATMAN-LEVEL AI: Generate comprehensive 30-40 word paragraphs for AI understanding
                    let originalText = formData.aiPrivateInfo.trim().toLowerCase();
                    
                    // Fix grammar first
                    let cleanText = formData.aiPrivateInfo.trim()
                      .replace(/\bi\b/g, 'I')
                      .replace(/\s+/g, ' ')
                      .replace(/([.!?])\s*([a-z])/g, (match, punct, letter) => punct + ' ' + letter.toUpperCase())
                      .replace(/^([a-z])/, (match) => match.toUpperCase())
                      .replace(/\b(teh|hte)\b/gi, 'the')
                      .replace(/\b(adn|nad)\b/gi, 'and')
                      .replace(/\b(taht|thta)\b/gi, 'that')
                      .replace(/\b(youer|yuor)\b/gi, 'your');
                    
                    // Generate unique seed based on title + category + description
                    const seed = (formData.title + formData.category + originalText).length % 12;
                    
                    // 12 UNIQUE BATMAN-PRECISION TEMPLATES - detailed paragraphs, 30-40 words
                    const batmanTemplates = [
                      (text) => `Professional-grade ${text} features advanced engineering and premium construction. Designed for serious performance in demanding applications with enhanced reliability and consistent results.`,
                      (text) => `Industrial-strength ${text} delivers consistent results through rigorous testing and quality materials. Built with premium components for long-term reliability and demanding professional environments.`,
                      (text) => `High-performance ${text} offers superior functionality through innovative design and cutting-edge technology. Engineered for maximum efficiency and durability in challenging applications and conditions.`,
                      (text) => `Commercial-quality ${text} provides exceptional value with professional-grade construction and advanced features. Reliable performance for demanding applications with measurable improvements and enhanced functionality.`,
                      (text) => `Laboratory-tested ${text} meets strict quality standards with advanced engineering and precision manufacturing. Delivers consistent performance through quality components and enhanced durability features.`,
                      (text) => `Premium ${text} combines cutting-edge technology with robust construction for superior performance. Advanced features and quality materials ensure reliable operation in demanding professional applications.`,
                      (text) => `Heavy-duty ${text} exceeds industry standards through rigorous testing and premium materials. Engineered for long-term reliability and consistent performance in challenging professional environments.`,
                      (text) => `Precision-engineered ${text} offers advanced functionality with quality components and enhanced durability. Designed for consistent results and reliable performance in demanding applications and conditions.`,
                      (text) => `Enterprise-grade ${text} provides professional performance with enhanced durability and advanced features. Built for demanding environments with quality materials and consistent reliable operation.`,
                      (text) => `High-capacity ${text} delivers superior results through advanced engineering and quality materials. Designed for optimal performance and enhanced functionality in demanding professional applications.`,
                      (text) => `Technical-grade ${text} features precision construction and tested reliability with enhanced performance capabilities. Engineered for consistent results and demanding applications with advanced functionality.`,
                      (text) => `Professional ${text} offers enhanced functionality through quality engineering and advanced features. Designed to exceed expectations in demanding applications with reliable consistent performance.`
                    ];
                    
                    // Extract core product essence (remove common words)
                    const productEssence = cleanText
                      .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/gi, '')
                      .replace(/\s+/g, ' ')
                      .trim()
                      .split(' ')
                      .slice(0, 3)
                      .join(' ');
                    
                    // Apply unique template based on seed
                    let enhanced = batmanTemplates[seed](productEssence);
                    
                    // Ensure 30-40 words for AI understanding
                    const words = enhanced.split(/\s+/);
                    if (words.length > 40) {
                      enhanced = words.slice(0, 40).join(' ') + '.';
                    } else if (words.length < 30) {
                      enhanced = enhanced + ' Enhanced premium quality features and advanced functionality for superior performance.';
                      const newWords = enhanced.split(/\s+/);
                      if (newWords.length > 40) {
                        enhanced = newWords.slice(0, 40).join(' ') + '.';
                      }
                    }
                    
                    setFormData({ ...formData, aiPrivateInfo: enhanced });
                    toast({
                      title: "BATMAN-LEVEL PRECISION ACTIVATED!",
                      description: `Detailed template #${seed + 1} applied • Comprehensive AI info • 30-40 words for perfect understanding`,
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-blue-600 text-white border-none hover:from-purple-600 hover:to-blue-700 font-medium"
                >
                  <span className="mr-1">⚡</span>
                  AI MAXIMIZE (1000%+ Conversion)
                </Button>
                
                <div className="text-xs text-gray-600 self-center">
                  <span className="font-semibold text-purple-600">Batman-level precision</span> • Comprehensive • Detailed • AI Understanding
                </div>
              </div>
              
              <p className="text-xs text-purple-600 font-medium">
                🧠 AI will transform your description into a comprehensive 30-40 word paragraph for perfect AI chatbot understanding and strategic conversion advantage
              </p>
              
              <p className="text-xs text-orange-600 font-medium">
                🤖 Private field - Only the AI chatbot can see this information to help users find products faster and more accurately. Enhanced info = better product matching!
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="imageUrl">Product Image (Optional)</Label>
            <div className="space-y-2 mt-1">
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl && !formData.imageUrl.startsWith('data:') ? formData.imageUrl : ''}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/product-image.jpg"
                  className="flex-1"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="main-image-upload"
                  />
                  <Button type="button" variant="outline" size="sm" className="h-9 px-3">
                    <Upload className="w-4 h-4 mr-1" />
                    Upload
                  </Button>
                </div>
              </div>
              {formData.imageUrl && formData.imageUrl.startsWith('data:') && (
                <div className="flex items-center text-xs text-green-600">
                  <Image className="w-3 h-3 mr-1" />
                  Image uploaded successfully
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add a URL link or upload from your camera roll/files
            </p>
          </div>

          {/* Additional Images Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Additional Images (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImageField}
                className="text-xs h-7"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Image
              </Button>
            </div>
            
            {additionalImages.map((imageUrl, index) => (
              <div key={index} className="space-y-2 mb-3">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={imageUrl && !imageUrl.startsWith('data:') ? imageUrl : ''}
                    onChange={(e) => updateImageField(index, e.target.value)}
                    placeholder={`https://images.unsplash.com/image-${index + 2}.jpg`}
                    className="flex-1"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAdditionalImageUpload(index, e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id={`additional-image-upload-${index}`}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-9 px-3">
                      <Upload className="w-4 h-4 mr-1" />
                      Upload
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeImageField(index)}
                    className="px-2 h-9"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                {imageUrl && imageUrl.startsWith('data:') && (
                  <div className="flex items-center text-xs text-green-600">
                    <Image className="w-3 h-3 mr-1" />
                    Image uploaded successfully
                  </div>
                )}
              </div>
            ))}
            
            <p className="text-xs text-gray-500 mt-1">
              Add multiple images with URL links or upload from your camera roll/files
            </p>
          </div>

          <div>
            <Label htmlFor="price">Product Price (Optional)</Label>
            <Input
              id="price"
              value={formData.price || ""}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="$29.99"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the product price (e.g., $29.99, €45, ¥1000)
            </p>
          </div>

          <div>
            <Label>Categories <span className="text-gray-400 font-normal">(select all that apply)</span></Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { value: "Hot Deals", emoji: "🔥" },
                { value: "Tech & Gadgets", emoji: "📱" },
                { value: "Fashion", emoji: "👔" },
                { value: "Health & Fitness", emoji: "💪" },
                { value: "Travel", emoji: "✈️" },
                { value: "Subscriptions", emoji: "🔄" },
              ].map(({ value: cat, emoji }) => {
                const selected = (formData.categories || []).includes(cat);
                return (
                  <div
                    key={cat}
                    onClick={() => {
                      const current = formData.categories || [];
                      const updated = selected ? current.filter(c => c !== cat) : [...current, cat];
                      if (updated.length === 0) return;
                      const primary = updated.includes("Hot Deals") ? "Hot Deals" : updated[0];
                      setFormData({ ...formData, categories: updated, category: primary });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all select-none ${selected ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}
                  >
                    <span>{emoji}</span>
                    <span className="text-sm">{cat}</span>
                    {selected && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                  </div>
                );
              })}
            </div>
            {(formData.categories || []).length === 0 && (
              <p className="text-xs text-red-500 mt-1">Select at least one category</p>
            )}
          </div>

          {/* Verified Source Badge Checkbox */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-blue-50">
            <Checkbox
              id="verified-badge"
              checked={formData.isVerified}
              onCheckedChange={(checked) => setFormData({ ...formData, isVerified: Boolean(checked) })}
            />
            <Label htmlFor="verified-badge" className="text-sm font-medium cursor-pointer">
              🔒 Verified Source Badge (Amazon/Walmart/etc)
            </Label>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm text-gray-700">Scheduling Options</h3>
            
            <div>
              <Label htmlFor="scheduledPublish">Schedule Publish (Optional)</Label>
              <Input
                id="scheduledPublish"
                type="datetime-local"
                value={formData.scheduledPublishAt ? new Date(formData.scheduledPublishAt.getTime() - formData.scheduledPublishAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, scheduledPublishAt: e.target.value ? new Date(e.target.value) : undefined })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Set when this product should automatically go live</p>
            </div>

            <div>
              <Label htmlFor="scheduledDelete">Schedule Deletion (Optional)</Label>
              <Input
                id="scheduledDelete"
                type="datetime-local"
                value={formData.scheduledDeleteAt ? new Date(formData.scheduledDeleteAt.getTime() - formData.scheduledDeleteAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, scheduledDeleteAt: e.target.value ? new Date(e.target.value) : undefined })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Set when this product should automatically be removed</p>
            </div>
          </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1 bg-conversion-blue hover:bg-blue-700"
                        disabled={createLinkMutation.isPending}
                      >
                        {createLinkMutation.isPending ? "Publishing..." : "Publish Now"}
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={createLinkMutation.isPending}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Save as Draft
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drafts">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Draft Products ({drafts.length})</CardTitle>
                      <CardDescription>Manage your unpublished products</CardDescription>
                    </div>
                    {drafts.length > 0 && (
                      <Button
                        onClick={() => publishAllDraftsMutation.mutate()}
                        disabled={publishAllDraftsMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Publish All Drafts
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {drafts.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No drafts yet</p>
                      <p className="text-sm text-gray-400">Create a product and save it as a draft to see it here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {drafts.map((draft) => renderProductCard(draft, true))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage">
              <Card>
                <CardHeader>
                  <CardTitle>All Products ({allProducts.length})</CardTitle>
                  <CardDescription>Manage all your affiliate links</CardDescription>
                </CardHeader>
                <CardContent>
                  {allProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <Globe className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No products yet</p>
                      <p className="text-sm text-gray-400">Create your first product to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allProducts.map((product) => renderProductCard(product, false))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ideas">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Ideas 💡</CardTitle>
                      <CardDescription>
                        Product ideas submitted by users (max 2 words, one per device)
                      </CardDescription>
                    </div>
                    {userIdeas.length > 0 && (
                      <div className="flex items-center gap-2">
                        {userIdeas.some((i: UserIdea) => i.isReviewed) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={async () => {
                              try {
                                await apiRequest("DELETE", "/api/admin/user-ideas/reviewed");
                                queryClient.setQueryData(["/api/admin/user-ideas"], userIdeas.filter((i: UserIdea) => !i.isReviewed));
                                toast({ title: "🧹 Done!", description: "Reviewed ideas deleted." });
                              } catch {
                                toast({ title: "Error", description: "Failed to delete reviewed ideas", variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Reviewed
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex items-center gap-1.5"
                          onClick={async () => {
                            try {
                              await apiRequest("DELETE", "/api/admin/user-ideas/all");
                              queryClient.setQueryData(["/api/admin/user-ideas"], []);
                              toast({ title: "🧹 Cleared!", description: "All ideas deleted." });
                            } catch {
                              toast({ title: "Error", description: "Failed to delete all ideas", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete All
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {userIdeas.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No user ideas yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Ideas will appear here as users submit them
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userIdeas.map((idea) => (
                        <div key={idea.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="text-lg font-medium text-blue-600">
                                "{idea.idea}"
                              </div>
                              {idea.isReviewed ? (
                                <Badge variant="secondary">Reviewed</Badge>
                              ) : (
                                <Badge variant="outline">New</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Device: {idea.deviceId.slice(-8)} • 
                              Submitted: {new Date(idea.createdAt).toLocaleDateString()} at {new Date(idea.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                          {!idea.isReviewed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiRequest("PUT", `/api/admin/user-ideas/${idea.id}/review`);
                                  refetchIdeas();
                                  toast({
                                    title: "Marked as Reviewed",
                                    description: "Idea has been marked as reviewed",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to mark as reviewed",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Mark as Reviewed
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        Contact Messages 📬
                      </CardTitle>
                      <CardDescription>
                        Messages submitted via the "Contact Us" button. Use AI Reply to generate a suggested response.
                      </CardDescription>
                    </div>
                    {contactMsgs.length > 0 && (
                      <div className="flex items-center gap-2">
                        {contactMsgs.some((m: any) => m.isResolved) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={async () => {
                              try {
                                await apiRequest("DELETE", "/api/contact/messages/resolved");
                                queryClient.setQueryData(["/api/contact/messages"], contactMsgs.filter((m: any) => !m.isResolved));
                                toast({ title: "🧹 Done!", description: "Resolved messages deleted." });
                              } catch {
                                toast({ title: "Error", description: "Failed to delete resolved messages", variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Resolved
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex items-center gap-1.5"
                          onClick={async () => {
                            try {
                              await apiRequest("DELETE", "/api/contact/messages/all");
                              queryClient.setQueryData(["/api/contact/messages"], []);
                              toast({ title: "🧹 Cleared!", description: "All messages deleted." });
                            } catch {
                              toast({ title: "Error", description: "Failed to delete all messages", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete All
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {contactMsgs.length === 0 ? (
                    <div className="text-center py-8">
                      <MailOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-sm text-gray-400 mt-1">Messages from the Contact Us popup will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contactMsgs.map((msg: any) => (
                        <div key={msg.id} className={`border rounded-xl p-4 space-y-3 ${msg.isResolved ? "opacity-50 bg-gray-50" : "bg-white"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-900">{msg.name || "Anonymous"}</span>
                                {msg.isResolved ? (
                                  <Badge variant="secondary" className="text-[10px]">Resolved</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600">Open</Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                Device: ...{(msg.deviceId || "unknown").slice(-8)} · {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                            "{msg.message}"
                          </div>

                          {/* AI Reply area */}
                          {msgAiReplies[msg.id] && (
                            <div className="rounded-lg px-3 py-2.5 text-xs text-purple-800 space-y-1" style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}>
                              <div className="flex items-center gap-1.5 font-semibold text-purple-700">
                                <Bot className="w-3.5 h-3.5" /> AI Suggested Response
                              </div>
                              <p className="leading-relaxed">{msgAiReplies[msg.id]}</p>
                            </div>
                          )}

                          {!msg.isResolved && (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-700 border-purple-300 hover:bg-purple-50"
                                onClick={() => {
                                  const reply = generateAiReply(msg.message, msg.deviceId);
                                  setMsgAiReplies(prev => ({ ...prev, [msg.id]: reply }));
                                }}
                              >
                                <Bot className="w-3.5 h-3.5 mr-1" /> AI Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                onClick={async () => {
                                  try {
                                    await apiRequest("PUT", `/api/contact/messages/${msg.id}/resolve`, {
                                      aiResponse: msgAiReplies[msg.id],
                                    });
                                    refetchMsgs();
                                    toast({ title: "Resolved", description: "Message marked as resolved" });
                                  } catch {
                                    toast({ title: "Error", description: "Failed to resolve", variant: "destructive" });
                                  }
                                }}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>

    {/* Schedule Publishing/Deletion Dialog */}
    <Dialog open={!!schedulingProduct} onOpenChange={() => setSchedulingProduct(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {schedulingProduct?.type === 'publish' ? 'Schedule Publishing' : 'Schedule Deletion'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Schedule automatic {schedulingProduct?.type === 'publish' ? 'publishing' : 'deletion'} for: <strong>{schedulingProduct?.title}</strong>
          </p>
          
          <div>
            <Label htmlFor="scheduleDateTime">
              {schedulingProduct?.type === 'publish' ? 'Publish' : 'Delete'} Date & Time
            </Label>
            <Input
              id="scheduleDateTime"
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (schedulingProduct && scheduleDate) {
                  if (schedulingProduct.type === 'publish') {
                    schedulePublishMutation.mutate({
                      id: schedulingProduct.id,
                      scheduledPublishAt: new Date(scheduleDate),
                    });
                  } else {
                    scheduleDeleteMutation.mutate({
                      id: schedulingProduct.id,
                      scheduledDeleteAt: new Date(scheduleDate),
                    });
                  }
                }
              }}
              disabled={!scheduleDate || scheduleDeleteMutation.isPending || schedulePublishMutation.isPending}
              className="flex-1"
            >
              {schedulingProduct?.type === 'publish' ? 'Schedule Publishing' : 'Schedule Deletion'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSchedulingProduct(null);
                setScheduleDate("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
