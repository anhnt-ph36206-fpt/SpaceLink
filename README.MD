# SpaceLink Tech Store

## Dự án website bán sản phẩm công nghệ SpaceLink

### Công nghệ sử dụng

1.  Backend

- Laravel 12
- Laravel Sanctum
- MySQL

2.  Frontend

- ReactJS
- TailwindCSS
- Shadcn UI
- TypeScript
- Vite
- Ant Design

## Cách cài đặt dự án

- Bước 1: Clone dự án về bằng cách mở terminal và chạy lệnh:

  ```
  git clone https://github.com/anhnt-ph36206-fpt/SpaceLink.
  ```

- Bước 2: Cài đặt thư viện Back-End (Laravel 12)

  ```bash
  cd C:/laragon/www/SpaceLink
  composer install
  ```


- Bước 3: Cài đặt thư viện Front-End (ReactJS 19)

    ```bash
    cd C:/laragon/www/SpaceLink/frontend
    npm install
    
- Bước 4: Cấu hình Back-End Cơ Bản:
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

