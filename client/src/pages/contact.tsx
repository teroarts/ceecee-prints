import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email"),
  message: z.string().min(10, "Tell us a little more (10+ characters)"),
});

type ContactValues = z.infer<typeof contactSchema>;

export default function Contact() {
  const { toast } = useToast();

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  useEffect(() => {
    document.title = "Contact | CeeCee Prints";
  }, []);

  const onSubmit = () => {
    form.reset();
    toast({
      title: "Message sent",
      description: "We usually reply within one business day.",
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-20">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Get in touch</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Questions about an order, a size, or a restock — we answer every
            message ourselves.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" autoComplete="name" data-testid="input-contact-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" autoComplete="email" data-testid="input-contact-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="How can we help?"
                        data-testid="input-contact-message"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="h-11 px-6 text-sm font-semibold" data-testid="button-contact-send">
                Send message
              </Button>
            </form>
          </Form>
        </div>

        <aside className="h-fit space-y-6 rounded-lg border border-card-border bg-card p-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </h2>
            <p className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              hello@ceeceeprints.co
            </p>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Studio
            </h2>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              1420 Prairie Ave, Suite 3<br />
              Wichita, KS 67201
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Printing soon from Nairobi, Kenya — the studio above is our US
              fulfillment partner.
            </p>
          </div>
          <div className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
            <p>Mon–Fri, 9am–5pm CT</p>
            <p className="mt-1">We usually reply within one business day.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
