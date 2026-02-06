# Tài liệu Backend - SpaceLink

## Công nghệ sử dụng

**Laravel 12** + **PHP 8.2** + **MySQL 8.0** + **Composer 2.5**

### Các thư viện chính trong composer.json

#### Core Framework

- **laravel/framework**: `^12.0` - Laravel framework core
- **php**: `^8.2` - PHP phiên bản 8.2 trở lên

#### Authentication & Authorization

- **laravel/sanctum**: `^4.3` - API authentication với token
  - Cung cấp SPA authentication
  - Mobile application authentication
  - Simple token-based API authentication

#### Development Tools

- **laravel/tinker**: `^2.10.1` - REPL (Read-Eval-Print Loop) để tương tác với Laravel app
  - Debug và test code trực tiếp
  - Chạy queries, test functions

#### Development Dependencies (require-dev)

##### Testing & Quality

- **pestphp/pest**: `^4.3` - Testing framework hiện đại cho PHP
- **pestphp/pest-plugin-laravel**: `^4.0` - Pest plugin cho Laravel
- **mockery/mockery**: `^1.6` - Mocking framework cho unit tests
- **fakerphp/faker**: `^1.23` - Generate fake data cho testing/seeding

##### Code Quality

- **laravel/pint**: `^1.24` - Opinionated PHP code style fixer (dựa trên PHP-CS-Fixer)
- **nunomaduro/collision**: `^8.6` - Beautiful error reporting cho CLI

##### Development Tools

- **laravel/sail**: `^1.41` - Docker development environment
- **laravel/pail**: `^1.2.2` - Real-time log viewer
- **laravel/boost**: `*` - Performance optimization tool (Laravel 12 feature)

---

## Cấu trúc thư mục

### 1. Cấu trúc tổng quát Laravel

```
backend/
├── app/                    # Code chính của application
├── bootstrap/              # Framework bootstrap files
├── config/                 # Configuration files
├── database/               # Migrations, seeders, factories
├── public/                 # Public assets (entry point)
├── resources/              # Views, raw assets (CSS, JS)
├── routes/                 # Route definitions
├── storage/                # Compiled files, logs, cache
├── tests/                  # Automated tests
├── vendor/                 # Composer dependencies
├── .env                    # Environment variables
├── artisan                 # CLI command-line tool
├── composer.json           # Composer dependencies
└── composer.lock           # Locked dependency versions
```

### 2. Cấu trúc chi tiết thư mục `app/`

```
app/
├── Console/               # Artisan commands
│   └── Kernel.php        # Schedule commands, commands registration
├── Exceptions/           # Exception handlers
│   └── Handler.php       # Global exception handler
├── Http/                 # HTTP layer
│   ├── Controllers/      # Controllers
│   ├── Middleware/       # Middleware
│   ├── Requests/         # Form requests (validation)
│   └── Resources/        # API resources (transformers)
├── Models/               # Eloquent models
├── Policies/             # Authorization policies
├── Providers/            # Service providers
│   ├── AppServiceProvider.php
│   └── RouteServiceProvider.php
└── Services/             # Business logic services (custom)
```

#### **`app/Console/`** - CLI Commands

```
Console/
├── Commands/
│   ├── SendEmailReminder.php    # Custom command
│   └── GenerateReport.php       # Custom command
└── Kernel.php                    # Command scheduler
```

**Mục đích**:

- Tạo custom Artisan commands
- Schedule tasks (cron jobs)
- Background processing

**Ví dụ**: `php artisan email:send`, scheduled tasks

#### **`app/Exceptions/`** - Exception Handling

```
Exceptions/
├── Handler.php                   # Global exception handler
├── CustomException.php           # Custom exceptions
└── ApiException.php
```

**Mục đích**:

- Xử lý exceptions toàn cục
- Custom exception classes
- API error responses formatting

#### **`app/Http/Controllers/`** - Controllers

```
Http/Controllers/
├── Controller.php                # Base controller
├── Auth/
│   ├── LoginController.php
│   ├── RegisterController.php
│   └── ForgotPasswordController.php
├── Api/                          # API controllers
│   ├── UserController.php
│   ├── PostController.php
│   └── CommentController.php
└── Web/                          # Web controllers
    └── HomeController.php
```

**Mục đích**:

- Handle HTTP requests
- Validate input
- Return responses
- Organize business logic

**Best Practice**: Keep controllers thin, move business logic to Services

#### **`app/Http/Middleware/`** - Middleware

```
Http/Middleware/
├── Authenticate.php              # Authentication middleware
├── VerifyCsrfToken.php          # CSRF protection
├── CheckRole.php                # Custom role check
├── LogRequests.php              # Request logging
└── Cors.php                     # CORS handling
```

**Mục đích**:

- Filter HTTP requests
- Authentication/Authorization
- Logging, rate limiting
- Request/Response modification

**Common Middleware**: `auth`, `throttle`, `verified`, `guest`

#### **`app/Http/Requests/`** - Form Request Validation

```
Http/Requests/
├── Auth/
│   ├── LoginRequest.php
│   └── RegisterRequest.php
├── Post/
│   ├── StorePostRequest.php
│   └── UpdatePostRequest.php
└── User/
    └── UpdateProfileRequest.php
```

**Mục đích**:

- Centralize validation logic
- Authorization logic
- Clean controllers
- Reusable validation rules

**Ví dụ**:

```php
public function rules(): array {
    return [
        'email' => 'required|email|unique:users',
        'password' => 'required|min:8'
    ];
}
```

#### **`app/Http/Resources/`** - API Resources (Transformers)

```
Http/Resources/
├── UserResource.php              # Transform User model
├── PostResource.php              # Transform Post model
├── PostCollection.php            # Transform Post collection
└── CommentResource.php
```

**Mục đích**:

- Transform models to JSON
- Customize API responses
- Hide sensitive fields
- Add computed fields

**Ví dụ**:

```php
public function toArray($request): array {
    return [
        'id' => $this->id,
        'name' => $this->name,
        'email' => $this->email,
        'created_at' => $this->created_at->toDateTimeString(),
    ];
}
```

#### **`app/Models/`** - Eloquent Models

```
Models/
├── User.php                      # User model
├── Post.php                      # Post model
├── Comment.php                   # Comment model
├── Category.php                  # Category model
└── Traits/                       # Model traits
    ├── HasUuid.php
    └── Searchable.php
```

**Mục đích**:

- Interact với database (ORM)
- Define relationships
- Accessors/Mutators
- Query scopes

**Relationships**: `hasMany`, `belongsTo`, `belongsToMany`, `hasOne`

#### **`app/Policies/`** - Authorization Policies

```
Policies/
├── PostPolicy.php                # Post authorization
├── UserPolicy.php                # User authorization
└── CommentPolicy.php
```

**Mục đích**:

- Centralize authorization logic
- Gate-based authorization
- Resource-based permissions

**Ví dụ**:

```php
public function update(User $user, Post $post): bool {
    return $user->id === $post->user_id;
}
```

#### **`app/Providers/`** - Service Providers

```
Providers/
├── AppServiceProvider.php        # Application service provider
├── RouteServiceProvider.php      # Route service provider
├── AuthServiceProvider.php       # Authentication/authorization
├── BroadcastServiceProvider.php  # Broadcasting
└── EventServiceProvider.php      # Events
```

**Mục đích**:

- Bootstrap application
- Register services to container
- Bind interfaces to implementations
- Configure packages

#### **`app/Services/`** - Business Logic Services (Custom)

```
Services/
├── AuthService.php               # Authentication business logic
├── PostService.php               # Post business logic
├── PaymentService.php            # Payment processing
├── NotificationService.php       # Notification handling
└── FileUploadService.php         # File upload handling
```

**Mục đích**:

- Complex business logic
- Reusable logic across controllers
- Keep controllers thin
- Separation of concerns

---

### 3. Cấu trúc thư mục `config/`

```
config/
├── app.php                       # Application config (timezone, locale)
├── auth.php                      # Authentication config
├── cache.php                     # Cache config
├── database.php                  # Database connections
├── filesystems.php               # File storage config
├── mail.php                      # Email config
├── queue.php                     # Queue config
├── services.php                  # Third-party services
└── session.php                   # Session config
```

**Mục đích**: Centralize configuration, environment-based config

---

### 4. Cấu trúc thư mục `database/`

```
database/
├── factories/                    # Model factories cho testing
│   └── UserFactory.php
├── migrations/                   # Database migrations
│   ├── 2024_01_01_000000_create_users_table.php
│   ├── 2024_01_02_000000_create_posts_table.php
│   └── 2024_01_03_000000_create_comments_table.php
├── seeders/                      # Database seeders
│   ├── DatabaseSeeder.php
│   ├── UserSeeder.php
│   └── PostSeeder.php
└── .gitignore
```

#### **Migrations** - Database Version Control

**Mục đích**:

- Version control cho database schema
- Team collaboration
- Rollback changes
- Deploy database changes

**Commands**:

- `php artisan migrate` - Run migrations
- `php artisan migrate:rollback` - Rollback last batch
- `php artisan migrate:fresh` - Drop all tables and re-run

#### **Factories** - Test Data Generation

**Mục đích**:

- Generate fake data cho testing
- Seed database với sample data
- Consistent test data

#### **Seeders** - Database Seeding

**Mục đích**:

- Populate database với initial data
- Testing data
- Development data

**Command**: `php artisan db:seed`

---

### 5. Cấu trúc thư mục `routes/`

```
routes/
├── web.php                       # Web routes (session-based)
├── api.php                       # API routes (token-based)
├── console.php                   # Artisan command routes
└── channels.php                  # Broadcasting channels
```

#### **`web.php`** - Web Routes

- Session-based authentication
- CSRF protection
- Cookie-based state
- Server-side rendered pages

#### **`api.php`** - API Routes

- Stateless (token-based auth)
- No CSRF protection
- JSON responses
- Prefix: `/api/`

**Ví dụ**:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [UserController::class, 'show']);
    Route::apiResource('posts', PostController::class);
});
```

---

### 6. Cấu trúc thư mục `storage/`

```
storage/
├── app/                          # Application files
│   ├── public/                  # Public files (symlinked to public/storage)
│   └── private/                 # Private files
├── framework/                    # Framework cache, sessions, views
│   ├── cache/
│   ├── sessions/
│   └── views/
└── logs/                         # Application logs
    └── laravel.log
```

**Mục đích**:

- File uploads storage
- Cache storage
- Compiled views
- Log files
- Session files

**Important**: `storage/app/public` should be symlinked to `public/storage`

**Command**: `php artisan storage:link`

---

### 7. Cấu trúc thư mục `tests/`

```
tests/
├── Feature/                      # Feature tests (HTTP, integration)
│   ├── Auth/
│   │   ├── LoginTest.php
│   │   └── RegisterTest.php
│   ├── Post/
│   │   ├── CreatePostTest.php
│   │   └── UpdatePostTest.php
│   └── ExampleTest.php
├── Unit/                         # Unit tests (isolated logic)
│   ├── UserTest.php
│   └── PostServiceTest.php
├── Pest.php                      # Pest configuration
└── TestCase.php                  # Base test case
```

**Feature Tests**: Test complete features (HTTP requests, database)
**Unit Tests**: Test isolated units (functions, classes)

**Commands**:

- `php artisan test` - Run all tests
- `php artisan test --filter=LoginTest` - Run specific test

---

## Cấu trúc gợi ý mở rộng (Best Practices)

### 1. **Repository Pattern** (Khuyên dùng cho logic phức tạp)

```
app/
├── Repositories/
│   ├── Contracts/               # Interfaces
│   │   ├── UserRepositoryInterface.php
│   │   └── PostRepositoryInterface.php
│   ├── Eloquent/               # Implementations
│   │   ├── UserRepository.php
│   │   └── PostRepository.php
│   └── BaseRepository.php
```

**Mục đích**:

- Tách logic database khỏi business logic
- Dễ test (mock repositories)
- Swap implementations (Eloquent → MongoDB)

### 2. **Domain-Driven Design (DDD)** Structure

```
app/
├── Domain/                      # Business domain
│   ├── User/
│   │   ├── Models/
│   │   ├── Repositories/
│   │   ├── Services/
│   │   └── Actions/
│   └── Post/
│       └── ...
└── Application/                 # Application layer
    ├── Http/
    └── Console/
```

**Ưu điểm**: Scaling cho dự án lớn và phức tạp

### 3. **Actions Pattern** (Single-purpose classes)

```
app/
├── Actions/
│   ├── Auth/
│   │   ├── LoginUser.php
│   │   └── RegisterUser.php
│   ├── Post/
│   │   ├── CreatePost.php
│   │   ├── UpdatePost.php
│   │   └── DeletePost.php
│   └── User/
│       └── UpdateUserProfile.php
```

**Mục đích**:

- Single responsibility
- Reusable logic
- Easy to test
- Clean controllers

### 4. **Events & Listeners**

```
app/
├── Events/
│   ├── UserRegistered.php
│   ├── PostCreated.php
│   └── OrderPlaced.php
└── Listeners/
    ├── SendWelcomeEmail.php
    ├── NotifyFollowers.php
    └── ProcessPayment.php
```

**Mục đích**:

- Decouple logic
- Async processing
- Event-driven architecture

### 5. **Jobs & Queues**

```
app/
├── Jobs/
│   ├── SendEmailJob.php
│   ├── ProcessVideoJob.php
│   └── GenerateReportJob.php
```

**Mục đích**:

- Background processing
- Heavy tasks (emails, file processing)
- Improve response time

**Commands**:

- `php artisan queue:work` - Process queue jobs
- `php artisan queue:failed` - List failed jobs

### 6. **Notifications**

```
app/
├── Notifications/
│   ├── UserRegisteredNotification.php
│   ├── PostLikedNotification.php
│   └── CommentReplyNotification.php
```

**Channels**: mail, database, broadcast, SMS (Nexmo/Twilio), Slack

---

## Giải thích chi tiết files quan trọng

### **`composer.json`**

File cấu hình Composer:

- **require**: Dependencies cho production
- **require-dev**: Dependencies cho development only
- **autoload**: PSR-4 autoloading
- **scripts**: Custom scripts (setup, dev, test)

### **`.env`**

Environment variables:

- **APP_ENV**: Environment (local, production)
- **APP_KEY**: Application encryption key
- **DB\_\***: Database configuration
- **MAIL\_\***: Email configuration
- **QUEUE\_\***: Queue configuration

**Important**: Never commit `.env` to version control!

### **`artisan`**

Laravel CLI tool:

```bash
php artisan list              # List all commands
php artisan make:model User   # Create model
php artisan make:controller UserController
php artisan migrate           # Run migrations
php artisan tinker            # REPL
```

### **`bootstrap/app.php`**

Bootstrap Laravel application:

- Create application instance
- Bind important interfaces
- Return application instance

---

## Workflow Development

### 1. **Development Commands**

```bash
composer install              # Install dependencies
php artisan key:generate      # Generate app key
php artisan migrate           # Run migrations
php artisan db:seed           # Seed database
php artisan serve             # Start dev server (http://localhost:8000)
php artisan queue:work        # Process queue jobs
php artisan schedule:work     # Run scheduled tasks
```

### 2. **Laravel Sanctum Authentication Flow**

```
1. User login → API returns token
2. Frontend stores token
3. Frontend sends token in Authorization header
4. Backend validates token via Sanctum middleware
5. User authenticated for API requests
```

**Routes**:

```php
// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes (require token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [UserController::class, 'show']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
```

### 3. **Best Practices**

- **Controllers**: Keep thin, delegate to Services/Actions
- **Validation**: Use Form Requests
- **Authorization**: Use Policies and Gates
- **Database**: Use migrations, never modify database manually
- **API Resources**: Transform model data consistently
- **Error Handling**: Custom exceptions, proper HTTP status codes
- **Security**: Validate input, sanitize output, use CSRF protection
- **Performance**: Query optimization, eager loading, caching
- **Testing**: Write tests for critical features

### 4. **API Response Structure**

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "errors": null
}
```

**Error Response**:

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

### 5. **Database Optimization**

- **Eager Loading**: Prevent N+1 queries
  ```php
  User::with('posts')->get(); // Instead of lazy loading
  ```
- **Indexes**: Add indexes to frequently queried columns
- **Query Optimization**: Use `select()`, `chunk()`, `cursor()`
- **Caching**: Cache expensive queries

---

## Laravel 12 Features (Mới)

### **Laravel Boost**

- Performance optimization tool
- Automatic caching improvements
- Build-time optimizations

### **Improved Pest Integration**

- Native Pest support
- Better testing experience
- Parallel testing

### **Enhanced Type Safety**

- Better IDE support
- Improved type hints
- Stricter type checking

---

## Kết luận

Backend của SpaceLink được xây dựng với Laravel 12, tập trung vào:

- **Performance**: Boost optimizations, query optimization
- **Security**: Sanctum authentication, CSRF protection, validation
- **Code Quality**: PSR standards, Pint code styling, Pest testing
- **Developer Experience**: Artisan CLI, Tinker REPL, Pail log viewer
- **Scalability**: Service-oriented architecture, repository pattern
- **Testing**: Pest framework, feature & unit tests
- **API-First**: RESTful API design, resource transformers, Sanctum auth

Cấu trúc được thiết kế để dễ maintain, scale và test cho dự án SpaceLink.
