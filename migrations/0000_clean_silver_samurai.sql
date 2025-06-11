CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rota_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"us_member_id" integer,
	"uk_member_id" integer,
	"notes" text,
	"is_manual" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rota_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"assignment_id" integer NOT NULL,
	"region" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"region" text NOT NULL,
	"role" text DEFAULT 'developer' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_dsg_member" boolean DEFAULT false NOT NULL,
	"holiday_start" date,
	"holiday_end" date,
	CONSTRAINT "team_members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_assignments" ADD CONSTRAINT "rota_assignments_us_member_id_team_members_id_fk" FOREIGN KEY ("us_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_assignments" ADD CONSTRAINT "rota_assignments_uk_member_id_team_members_id_fk" FOREIGN KEY ("uk_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_history" ADD CONSTRAINT "rota_history_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_history" ADD CONSTRAINT "rota_history_assignment_id_rota_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."rota_assignments"("id") ON DELETE no action ON UPDATE no action;