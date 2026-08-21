CREATE TABLE `identities` (
	`issuer` text NOT NULL,
	`subject` text NOT NULL,
	`user_id` text NOT NULL,
	CONSTRAINT `identities_pk` PRIMARY KEY(`issuer`, `subject`),
	CONSTRAINT `fk_identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `legacy_credentials` (
	`username` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`password_hash` text,
	`disabled_at` integer,
	CONSTRAINT `fk_legacy_credentials_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `patches` (
	`minecraft_version` text NOT NULL,
	`path` text NOT NULL,
	`status` text NOT NULL,
	`responsible_user_id` text,
	`updated_at` integer NOT NULL,
	`duration` integer,
	CONSTRAINT `patches_pk` PRIMARY KEY(`minecraft_version`, `path`),
	CONSTRAINT `fk_patches_responsible_user_id_users_id_fk` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`username` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `identities_user_id_idx` ON `identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `legacy_credentials_user_id_idx` ON `legacy_credentials` (`user_id`);--> statement-breakpoint
CREATE INDEX `patches_responsible_user_id_idx` ON `patches` (`responsible_user_id`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);