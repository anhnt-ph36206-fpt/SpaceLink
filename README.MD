# SpaceLink Tech Store

## Dự án website bán sản phẩm công nghệ SpaceLink

### Công nghệ sử dụng

1.  Backend

- Laravel 12
- Laravel Sanctum
- Laravel L5-Swagger
- Laravel Scout
- MySQL

2.  Frontend

- ReactJS
- TailwindCSS
- Bootstrap 5
- Shadcn UI
- TypeScript
- Vite
- Ant Design

## Cách cài đặt dự án

- Bước 1: Clone dự án về bằng cách mở terminal và chạy lệnh:

  ```
  git clone https://github.com/anhnt-ph36206-fpt/SpaceLink
  ```

- Bước 2: Di chuyển vào thư mục backend (Laravel 12)

  ```bash
  cd C:/laragon/www/SpaceLink
  ```

- Bước 3: Cài đặt thư viện Back-End (Laravel 12)

  ```bash
  composer install && composer update
  ```

- Hoặc
  ```bash
  composer i
  ```


- Bước 4: Di chuyển vào thư mục frontend (ReactJS 19)

  ```bash
  cd C:/laragon/www/SpaceLink/frontend
  ```

- Bước 5: Cài đặt thư viện Front-End (ReactJS 19)

  ```bash
  npm install
  ```

- Hoặc
  ```bash
  npm i
  ```
    
- Bước 6: Cấu hình Back-End Cơ Bản:
+   Thiết lập cấu hình .env và kết nối database

    ```bash
    cd C:/laragon/www/SpaceLink/backend
    cp .env.example .env
    php artisan key:generate
    ```
+   
    ```database
    DB_CONNECTION=mysql
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_DATABASE=spacelink
    DB_USERNAME=root
    DB_PASSWORD=
    ```
+ Migrate database và Seed data
    ```bash
    php artisan migrate --seed
    ```

+ Generate docs api
    ```bash
    php artisan l5-swagger:generate
    ```

+ Tạo link public cho storage
    ```bash
    php artisan storage:link
    ```

+ Chạy server Laravel
    ```bash
    php artisan serve
    ```

+ Chạy server React
    ```bash
    npm run dev
    ```

+ Truy cập vào trang web
    ```
    http://localhost:5173
    ```

+ Truy cập vào trang docs api
    ```
    http://localhost:8000/api/documentation
    ```