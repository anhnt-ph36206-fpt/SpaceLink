php artisan make:model Role -ms
php artisan make:model Permissions -ms
php artisan make:migration create_role_permissions_table
php artisan make:migration create_user_addresses_table

php artisan make:model Brand -ms
php artisan make:model Category -ms
php artisan make:model AttributeGroup -ms
php artisan make:model Attribute -ms
php artisan make:model Product -ms
php artisan make:model ProductImage -ms
php artisan make:model ProductVariant -ms
php artisan make:model ProductView -ms