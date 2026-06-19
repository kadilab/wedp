-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'CLIENT') NOT NULL DEFAULT 'CLIENT',
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `plan_id` VARCHAR(191) NULL,
    `subscription_status` VARCHAR(191) NOT NULL DEFAULT 'NONE',
    `plan_expires_at` DATETIME(3) NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `email_verify_token` VARCHAR(191) NULL,
    `reset_password_token` VARCHAR(191) NULL,
    `reset_password_expires` DATETIME(3) NULL,
    `preferred_language` VARCHAR(191) NOT NULL DEFAULT 'fr',
    `dark_mode` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('BASIC', 'PREMIUM', 'VIP') NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `max_guests` INTEGER NOT NULL,
    `max_templates` INTEGER NOT NULL,
    `custom_domain` BOOLEAN NOT NULL DEFAULT false,
    `whatsapp_enabled` BOOLEAN NOT NULL DEFAULT false,
    `email_enabled` BOOLEAN NOT NULL DEFAULT true,
    `pdf_enabled` BOOLEAN NOT NULL DEFAULT true,
    `analytics_enabled` BOOLEAN NOT NULL DEFAULT false,
    `priority_support` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `features` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plans_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `thumbnail` VARCHAR(191) NULL,
    `preview_image` VARCHAR(191) NULL,
    `background_url` VARCHAR(191) NULL,
    `background_opacity` INTEGER NULL DEFAULT 100,
    `html_content` LONGTEXT NULL,
    `css_content` LONGTEXT NULL,
    `config` JSON NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'MODERN',
    `is_premium` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `allow_background_change` BOOLEAN NOT NULL DEFAULT true,
    `color_scheme` JSON NULL,
    `preview_images` JSON NULL,
    `canvas_width` INTEGER NULL DEFAULT 800,
    `canvas_height` INTEGER NULL DEFAULT 1120,
    `user_id` VARCHAR(191) NULL,
    `is_custom` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `templates_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weddings` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `plan_id` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `bride_name` VARCHAR(191) NOT NULL,
    `groom_name` VARCHAR(191) NOT NULL,
    `wedding_date` DATETIME(3) NOT NULL,
    `ceremony_time` VARCHAR(191) NULL,
    `reception_time` VARCHAR(191) NULL,
    `program` JSON NULL,
    `commune_date` DATETIME(3) NULL,
    `commune_time` VARCHAR(191) NULL,
    `commune_venue` VARCHAR(191) NULL,
    `commune_address` TEXT NULL,
    `eglise_date` DATETIME(3) NULL,
    `eglise_time` VARCHAR(191) NULL,
    `eglise_venue` VARCHAR(191) NULL,
    `eglise_address` TEXT NULL,
    `reception_date` DATETIME(3) NULL,
    `reception_start_time` VARCHAR(191) NULL,
    `reception_venue` VARCHAR(191) NULL,
    `reception_address` TEXT NULL,
    `venue_name` VARCHAR(191) NULL,
    `venue_address` TEXT NULL,
    `venue_city` VARCHAR(191) NULL,
    `venue_country` VARCHAR(191) NULL,
    `venue_map_url` TEXT NULL,
    `custom_message` TEXT NULL,
    `primary_color` VARCHAR(191) NULL DEFAULT '#D4AF37',
    `secondary_color` VARCHAR(191) NULL DEFAULT '#FFFFFF',
    `text_color` VARCHAR(191) NULL,
    `bg_color` VARCHAR(191) NULL,
    `font_family` VARCHAR(191) NULL DEFAULT 'Playfair Display',
    `cover_photo` VARCHAR(191) NULL,
    `gallery_photos` JSON NULL,
    `logo` VARCHAR(191) NULL,
    `music_url` VARCHAR(191) NULL,
    `background_image` VARCHAR(191) NULL,
    `background_type` VARCHAR(191) NULL DEFAULT 'color',
    `background_gradient` VARCHAR(191) NULL,
    `background_opacity` INTEGER NULL DEFAULT 100,
    `qr_code_style` VARCHAR(191) NULL DEFAULT 'classic',
    `qr_code_color` VARCHAR(191) NULL DEFAULT '#000000',
    `qr_code_bg_color` VARCHAR(191) NULL DEFAULT '#FFFFFF',
    `qr_code_logo` VARCHAR(191) NULL,
    `qr_code_size` INTEGER NULL DEFAULT 300,
    `wants_print_service` BOOLEAN NOT NULL DEFAULT false,
    `print_quantity` INTEGER NULL,
    `print_paper_type` VARCHAR(191) NULL,
    `print_finish` VARCHAR(191) NULL,
    `print_size` VARCHAR(191) NULL,
    `print_notes` TEXT NULL,
    `couple_photo` VARCHAR(191) NULL,
    `dress_code` VARCHAR(191) NULL,
    `event_theme` VARCHAR(191) NULL,
    `rsvp_deadline` DATETIME(3) NULL,
    `additional_info` TEXT NULL,
    `social_links` JSON NULL,
    `tables` JSON NULL,
    `custom_domain` VARCHAR(191) NULL,
    `subdomain` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PENDING_PAYMENT', 'PENDING_ACTIVATION', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `published_at` DATETIME(3) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `qr_code_url` VARCHAR(191) NULL,
    `total_guests` INTEGER NOT NULL DEFAULT 0,
    `confirmed_guests` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `weddings_custom_domain_key`(`custom_domain`),
    UNIQUE INDEX `weddings_subdomain_key`(`subdomain`),
    UNIQUE INDEX `weddings_slug_key`(`slug`),
    INDEX `weddings_user_id_idx`(`user_id`),
    INDEX `weddings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guests` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `table_number` VARCHAR(191) NULL,
    `plus_ones` INTEGER NOT NULL DEFAULT 0,
    `dietary_restrictions` TEXT NULL,
    `notes` TEXT NULL,
    `rsvp_status` ENUM('PENDING', 'CONFIRMED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `rsvp_date` DATETIME(3) NULL,
    `rsvp_message` TEXT NULL,
    `invitation_sent` BOOLEAN NOT NULL DEFAULT false,
    `invitation_sent_at` DATETIME(3) NULL,
    `invitation_viewed` BOOLEAN NOT NULL DEFAULT false,
    `invitation_viewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `guests_wedding_id_idx`(`wedding_id`),
    UNIQUE INDEX `guests_wedding_id_email_key`(`wedding_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invitations` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `guest_id` VARCHAR(191) NOT NULL,
    `unique_code` VARCHAR(191) NOT NULL,
    `qr_code_data` TEXT NOT NULL,
    `qr_code_url` TEXT NULL,
    `pdf_url` TEXT NULL,
    `image_url` TEXT NULL,
    `short_url` VARCHAR(191) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `last_viewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invitations_guest_id_key`(`guest_id`),
    UNIQUE INDEX `invitations_unique_code_key`(`unique_code`),
    INDEX `invitations_wedding_id_idx`(`wedding_id`),
    INDEX `invitations_unique_code_idx`(`unique_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NULL,
    `plan_id` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `method` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `transaction_id` VARCHAR(191) NULL,
    `proof_url` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `processed_by` VARCHAR(191) NULL,
    `admin_note` TEXT NULL,
    `coupon_id` VARCHAR(191) NULL,
    `discount_amount` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payments_user_id_idx`(`user_id`),
    INDEX `payments_wedding_id_idx`(`wedding_id`),
    INDEX `payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `discount_type` VARCHAR(191) NOT NULL DEFAULT 'percentage',
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `max_uses` INTEGER NULL,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `min_purchase` DECIMAL(10, 2) NULL,
    `valid_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valid_until` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupons_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon_usages` (
    `id` VARCHAR(191) NOT NULL,
    `coupon_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `coupon_usages_coupon_id_user_id_key`(`coupon_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `check_ins` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `guest_id` VARCHAR(191) NOT NULL,
    `checked_in_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `checked_in_by` VARCHAR(191) NULL,
    `device_info` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `plus_ones_present` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,

    INDEX `check_ins_wedding_id_idx`(`wedding_id`),
    INDEX `check_ins_guest_id_idx`(`guest_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `action` ENUM('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'PAYMENT', 'ACTIVATION', 'QR_SCAN') NOT NULL,
    `entity` VARCHAR(191) NULL,
    `entity_id` VARCHAR(191) NULL,
    `details` JSON NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `logs_user_id_idx`(`user_id`),
    INDEX `logs_action_idx`(`action`),
    INDEX `logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'string',
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `data` JSON NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_idx`(`user_id`),
    INDEX `notifications_is_read_idx`(`is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `print_orders` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `paper_type` VARCHAR(191) NOT NULL DEFAULT 'premium',
    `finish` VARCHAR(191) NOT NULL DEFAULT 'mat',
    `size` VARCHAR(191) NOT NULL DEFAULT 'A5',
    `notes` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `shipping_address` TEXT NULL,
    `shipping_city` VARCHAR(191) NULL,
    `shipping_country` VARCHAR(191) NULL,
    `shipping_phone` VARCHAR(191) NULL,
    `tracking_number` VARCHAR(191) NULL,
    `estimated_delivery` DATETIME(3) NULL,
    `processed_at` DATETIME(3) NULL,
    `shipped_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `print_orders_wedding_id_idx`(`wedding_id`),
    INDEX `print_orders_user_id_idx`(`user_id`),
    INDEX `print_orders_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `background_images` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'general',
    `is_public` BOOLEAN NOT NULL DEFAULT true,
    `uploaded_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templates` ADD CONSTRAINT `templates_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weddings` ADD CONSTRAINT `weddings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weddings` ADD CONSTRAINT `weddings_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weddings` ADD CONSTRAINT `weddings_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guests` ADD CONSTRAINT `guests_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_guest_id_fkey` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_usages` ADD CONSTRAINT `coupon_usages_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_usages` ADD CONSTRAINT `coupon_usages_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_guest_id_fkey` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_orders` ADD CONSTRAINT `print_orders_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_orders` ADD CONSTRAINT `print_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
