import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Shield, Zap, BarChart3, Users, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bell,
      title: "Real-time Updates",
      description: "Get instant notifications when new notices are posted. Stay informed in real-time.",
    },
    {
      icon: Shield,
      title: "Role-based Access",
      description: "Secure access control for admins, staff, and students with appropriate permissions.",
    },
    {
      icon: Zap,
      title: "Quick & Efficient",
      description: "Post and view notices instantly. No more relying on physical boards or WhatsApp groups.",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track engagement, views, and notice performance with comprehensive analytics.",
    },
    {
      icon: Users,
      title: "Multi-department",
      description: "Organize notices by department and category for easy navigation and filtering.",
    },
    {
      icon: Search,
      title: "Advanced Search",
      description: "Find notices quickly with powerful search and filter capabilities.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ONBS</h1>
              <p className="text-xs text-muted-foreground">Bishop Barham University</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Login
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => navigate("/notices")}
            >
              View Notices
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-full text-sm text-secondary font-medium mb-4">
            <Zap className="w-4 h-4" />
            Modern. Efficient. Sustainable.
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Your Digital
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-glow to-secondary">
              Notice Board
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A centralized platform for Uganda Christian University to post, manage, and view official notices and announcements in real-time.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/notices")}
            >
              View Notices
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2"
              onClick={() => navigate("/auth")}
            >
              Staff Login
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
          {[
            { label: "Active Users", value: "500+" },
            { label: "Notices Posted", value: "1,200+" },
            { label: "Time Saved", value: "80%" },
          ].map((stat, index) => (
            <Card key={index} className="border-2 shadow-card">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need for modern notice management
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Choose ONBS?
              </h2>
              <p className="text-lg text-muted-foreground">
                Built for the modern university environment
              </p>
            </div>
            <div className="grid gap-6">
              {[
                {
                  title: "Reduce Costs",
                  description: "Eliminate printing costs and physical notice boards. Save money while going green.",
                },
                {
                  title: "Improve Communication",
                  description: "Ensure important messages reach everyone instantly, without relying on scattered WhatsApp groups.",
                },
                {
                  title: "Enhance Organization",
                  description: "Keep all university communications organized, searchable, and accessible in one place.",
                },
                {
                  title: "Data-Driven Insights",
                  description: "Understand engagement with analytics. Know what notices are being read and acted upon.",
                },
              ].map((benefit, index) => (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center">
                        <span className="text-secondary font-bold">{index + 1}</span>
                      </div>
                      {benefit.title}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {benefit.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card className="max-w-2xl mx-auto border-2 bg-gradient-to-br from-card to-muted/30">
          <CardHeader className="space-y-4 py-12">
            <CardTitle className="text-3xl md:text-4xl">
              Ready to Get Started?
            </CardTitle>
            <CardDescription className="text-lg">
              Join Uganda Christian University's digital transformation today
            </CardDescription>
            <div className="pt-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                onClick={() => navigate("/notices")}
              >
                View Latest Notices
              </Button>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Uganda Christian University - Bishop Barham University College</p>
          <p className="mt-2">Online Notice Board System</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
