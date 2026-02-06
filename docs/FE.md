# Tài liệu Frontend - SpaceLink

## Công nghệ sử dụng

**ReactJS 19** + **TailwindCSS 4** + **TypeScript 5** + **Vite 7** + **Ant Design 5**

### Các thư viện chính trong package.json

#### Core Libraries

- **react**: `^19.1.0` - Thư viện JavaScript để xây dựng giao diện người dùng
- **react-dom**: `^19.1.0` - Cung cấp phương thức DOM cho React
- **typescript**: `^5.9.3` - Ngôn ngữ lập trình có kiểu tĩnh
- **vite**: `^7.2.4` - Build tool và dev server nhanh

#### UI Framework & Styling

- **tailwindcss**: `^4.1.7` - Framework CSS utility-first
- **@tailwindcss/vite**: `^4.1.7` - Plugin Vite cho TailwindCSS
- **antd**: `^5.29.3` - Thư viện UI component Enterprise-grade
- **lucide-react**: `^0.513.0` - Bộ icon hiện đại và nhẹ

#### Icons & Design

- **@fortawesome/fontawesome-svg-core**: `^7.0.0` - Core FontAwesome
- **@fortawesome/free-solid-svg-icons**: `^7.0.0` - Icon solid miễn phí
- **@fortawesome/free-regular-svg-icons**: `^7.0.0` - Icon regular miễn phí
- **@fortawesome/react-fontawesome**: `^0.2.3` - Component React cho FontAwesome
- **react-icons**: `^5.5.0` - Bộ sưu tập icon phổ biến

#### Routing & Navigation

- **react-router-dom**: `^7.6.2` - Thư viện routing cho React

#### State Management & Data Fetching

- **@tanstack/react-query**: `^5.80.7` - Quản lý server state, caching và synchronization
- **axios**: `^1.10.0` - HTTP client để gọi API

#### Forms & Validation

- **react-hook-form**: `^7.56.3` - Quản lý form hiệu suất cao
- **react-select**: `^5.10.1` - Component select tùy chỉnh cao
- **react-datepicker**: `^8.7.0` - Component chọn ngày tháng

#### UI Enhancements

- **swiper**: `^11.2.10` - Slider/carousel hiện đại
- **keen-slider**: `^6.8.6` - Slider nhẹ và linh hoạt
- **recharts**: `^3.1.0` - Thư viện vẽ biểu đồ

#### Notifications & Feedback

- **react-hot-toast**: `^2.5.2` - Thông báo toast đẹp và nhẹ
- **react-toastify**: `^11.0.5` - Thư viện notification phổ biến

#### Authentication & Authorization

- **@react-oauth/google**: `^0.12.2` - Google OAuth integration
- **jwt-decode**: `^4.0.0` - Decode JWT token
- **jsonwebtoken**: `^9.0.2` - Tạo và verify JWT
- **bcryptjs**: `^3.0.3` - Mã hóa password

#### Real-time Communication

- **socket.io-client**: `^4.8.1` - WebSocket client cho giao tiếp real-time

#### Utilities

- **dayjs**: `^1.11.19` - Thư viện xử lý ngày tháng nhẹ
- **moment**: `^2.30.1` - Thư viện xử lý ngày tháng (legacy support)
- **lodash**: `^4.17.21` - Utility functions JavaScript

#### Development Tools

- **@vitejs/plugin-react**: `^5.1.1` - Plugin React cho Vite
- **eslint**: `^9.39.1` - Linter JavaScript/TypeScript
- **typescript-eslint**: `^8.54.0` - ESLint plugin cho TypeScript

---

## Cấu trúc thư mục

### 1. Cấu trúc tổng quát

```
frontend/
├── public/              # Tài nguyên tĩnh public (favicon, robots.txt)
├── src/                 # Mã nguồn chính
│   ├── api/            # Cấu hình và calls API
│   ├── assets/         # Tài nguyên tĩnh (images, fonts, icons)
│   ├── components/     # React components tái sử dụng
│   ├── layouts/        # Layout components
│   ├── pages/          # Page components (route pages)
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── constants/      # Hằng số, config constants
│   ├── types/          # TypeScript type definitions
│   ├── context/        # React Context providers
│   ├── store/          # State management (nếu dùng Redux/Zustand)
│   ├── services/       # Business logic services
│   ├── routes/         # Route configuration
│   ├── styles/         # Global styles, CSS
│   ├── App.tsx         # Root component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global CSS
├── .eslintrc.js        # ESLint configuration
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # TailwindCSS configuration
└── package.json        # Dependencies và scripts
```

### 2. Cấu trúc chi tiết thư mục `src/`

#### **`api/`** - Quản lý API Calls

```
api/
├── config/
│   ├── axios.config.ts      # Cấu hình axios instance, interceptors
│   └── endpoints.ts         # Định nghĩa các API endpoints
├── auth.api.ts              # API calls liên quan authentication
├── user.api.ts              # API calls liên quan user
├── post.api.ts              # API calls liên quan posts
└── index.ts                 # Export tất cả API functions
```

**Mục đích**: Tập trung hóa việc gọi API, quản lý headers, xử lý lỗi tập trung, retry logic.

#### **`assets/`** - Tài nguyên tĩnh

```
assets/
├── images/
│   ├── logo.svg
│   ├── banner.png
│   └── avatars/
├── fonts/
│   └── custom-font.woff2
├── icons/
│   └── custom-icons.svg
└── videos/
    └── intro.mp4
```

**Mục đích**: Chứa các file tĩnh được import vào components (không phải CDN).

#### **`components/`** - React Components

```
components/
├── common/                  # Components dùng chung
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── Button.module.css
│   ├── Input/
│   ├── Modal/
│   └── Card/
├── features/               # Components theo feature
│   ├── Auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── Profile/
│       ├── ProfileCard.tsx
│       └── ProfileEdit.tsx
└── index.ts               # Barrel exports
```

**Mục đích**: Components tái sử dụng, tách biệt logic UI.

#### **`layouts/`** - Layout Components

```
layouts/
├── MainLayout.tsx         # Layout chính cho app
├── AuthLayout.tsx         # Layout cho authentication pages
├── DashboardLayout.tsx    # Layout cho dashboard
└── components/
    ├── Header.tsx
    ├── Sidebar.tsx
    └── Footer.tsx
```

**Mục đích**: Quản lý cấu trúc chung của pages (header, sidebar, footer).

#### **`pages/`** - Page Components

```
pages/
├── Home/
│   ├── HomePage.tsx
│   └── components/        # Components riêng cho HomePage
├── Auth/
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── Profile/
│   └── ProfilePage.tsx
├── Dashboard/
│   └── DashboardPage.tsx
└── NotFound.tsx
```

**Mục đích**: Mỗi page tương ứng với một route, chứa components và logic cho page đó.

#### **`hooks/`** - Custom React Hooks

```
hooks/
├── useAuth.ts             # Hook quản lý authentication
├── useDebounce.ts         # Hook debounce input
├── useLocalStorage.ts     # Hook tương tác localStorage
├── useFetch.ts            # Hook fetch data
└── useIntersectionObserver.ts
```

**Mục đích**: Tái sử dụng stateful logic, tách logic khỏi UI components.

#### **`utils/`** - Utility Functions

```
utils/
├── validation.ts          # Hàm validation
├── format.ts              # Format date, currency, string
├── helpers.ts             # Helper functions tổng quát
├── constants.ts           # Constants
└── errorHandler.ts        # Xử lý lỗi
```

**Mục đích**: Pure functions tiện ích, không phụ thuộc vào React.

#### **`constants/`** - Hằng số

```
constants/
├── routes.ts              # Định nghĩa routes
├── apiEndpoints.ts        # API endpoints
├── config.ts              # App configuration
└── messages.ts            # Thông báo, error messages
```

**Mục đích**: Tập trung các giá trị constant, dễ maintain và update.

#### **`types/`** - TypeScript Type Definitions

```
types/
├── user.types.ts          # Types cho User
├── post.types.ts          # Types cho Post
├── api.types.ts           # Types cho API responses
└── common.types.ts        # Common types, interfaces
```

**Mục đích**: Định nghĩa types/interfaces dùng chung toàn app.

#### **`context/`** - React Context API

```
context/
├── AuthContext.tsx        # Context cho authentication
├── ThemeContext.tsx       # Context cho theme (dark/light mode)
└── NotificationContext.tsx
```

**Mục đích**: Quản lý global state đơn giản không cần Redux.

#### **`store/`** - State Management (Redux/Zustand)

```
store/
├── slices/
│   ├── authSlice.ts
│   ├── userSlice.ts
│   └── postSlice.ts
├── store.ts               # Configure store
└── hooks.ts               # Typed hooks
```

**Mục đích**: Quản lý complex state với Redux Toolkit hoặc Zustand.

#### **`services/`** - Business Logic Services

```
services/
├── authService.ts         # Business logic cho auth
├── userService.ts         # Business logic cho user
├── storageService.ts      # Local/session storage service
└── socketService.ts       # WebSocket service
```

**Mục đích**: Tách business logic khỏi components và API layer.

#### **`routes/`** - Route Configuration

```
routes/
├── index.tsx              # Main router setup
├── PrivateRoute.tsx       # Protected routes component
├── PublicRoute.tsx        # Public routes component
└── routeConfig.ts         # Routes configuration object
```

**Mục đích**: Tập trung cấu hình routing, guards, lazy loading.

#### **`styles/`** - Global Styles

```
styles/
├── global.css             # Global CSS
├── variables.css          # CSS variables (colors, spacing)
├── tailwind.css           # Tailwind directives
└── themes/
    ├── dark.css
    └── light.css
```

**Mục đích**: Quản lý styling toàn cục, themes, CSS variables.

---

### 3. Cấu trúc gợi ý mở rộng (Best Practices)

#### **Feature-based Architecture** (Khuyên dùng cho dự án lớn)

```
src/
├── features/              # Modules hóa theo tính năng
│   ├── auth/
│   │   ├── components/   # Components riêng cho auth
│   │   ├── hooks/        # Hooks riêng cho auth
│   │   ├── services/     # Services riêng cho auth
│   │   ├── types/        # Types riêng cho auth
│   │   ├── utils/        # Utils riêng cho auth
│   │   └── index.ts      # Public API của feature
│   ├── posts/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   └── profile/
│       └── ...
├── shared/               # Code dùng chung giữa features
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── core/                 # Core functionality (routing, layouts)
    ├── layouts/
    ├── routes/
    └── providers/
```

**Ưu điểm**:

- Dễ scale cho dự án lớn
- Code organization tốt hơn
- Dễ tìm kiếm và maintain
- Teams có thể làm việc độc lập trên từng feature

#### **Testing Structure**

```
src/
├── __tests__/            # Global tests
│   ├── setup.ts
│   └── utils.tsx
└── components/
    └── Button/
        ├── Button.tsx
        ├── Button.test.tsx      # Unit test
        └── Button.stories.tsx   # Storybook stories (nếu dùng)
```

#### **Config & Environment**

```
├── .env                  # Environment variables
├── .env.development      # Dev environment
├── .env.production       # Production environment
└── src/
    └── config/
        ├── app.config.ts # App configuration
        └── env.ts        # Environment variables với type safety
```

---

## Giải thích chi tiết files quan trọng

### **`package.json`**

File cấu hình npm, chứa dependencies, devDependencies và scripts:

- **dependencies**: Thư viện cần thiết cho production
- **devDependencies**: Thư viện chỉ dùng trong development
- **scripts**: Commands để chạy dev server, build, test, lint

### **`vite.config.ts`**

Cấu hình Vite build tool:

- Plugin configuration
- Alias paths
- Build optimization
- Dev server settings
- Environment variables

### **`tsconfig.json`**

Cấu hình TypeScript compiler:

- Compiler options (target, module, jsx)
- Path aliases
- Type checking strictness
- Include/exclude patterns

### **`tailwind.config.js`**

Cấu hình TailwindCSS:

- Custom colors, spacing, fonts
- Plugins (forms, typography)
- Content paths (purge CSS)
- Theme customization

### **`main.tsx`**

Entry point của application:

- Render root React component
- Wrap providers (Router, Query, Context)
- Import global styles

### **`App.tsx`**

Root component:

- Setup routing
- Global providers
- Layout structure

---

## Workflow Development

### 1. **Development Flow**

```bash
npm run dev          # Chạy dev server với hot reload
npm run build        # Build production
npm run preview      # Preview production build
npm run lint         # Chạy ESLint
npm run tsc          # Type check TypeScript
```

### 2. **Best Practices**

- **Component Design**: Tách nhỏ components, single responsibility
- **TypeScript**: Type mọi thứ, tránh `any`
- **Performance**: Lazy load routes/components, memoization
- **State Management**: Chọn đúng tool (Context cho simple, Query cho server state)
- **CSS**: Ưu tiên TailwindCSS utility classes, tránh inline styles
- **Naming**: PascalCase cho components, camelCase cho functions/variables
- **File Structure**: Colocate related files (component + styles + tests)

### 3. **Performance Optimization**

- **Code Splitting**: Lazy load pages và heavy components
- **Image Optimization**: WebP format, lazy loading images
- **Bundle Analysis**: Sử dụng bundle analyzer để tối ưu bundle size
- **Caching**: Sử dụng React Query cho caching API responses
- **Memoization**: `React.memo`, `useMemo`, `useCallback` khi cần

---

## Kết luận

Frontend của SpaceLink được xây dựng với các công nghệ hiện đại nhất (React 19, Vite 7, TailwindCSS 4), tập trung vào:

- **Performance**: Build tool nhanh, code splitting, optimization
- **Developer Experience**: TypeScript, ESLint, hot reload
- **UI/UX**: Ant Design, TailwindCSS, modern icons
- **Scalability**: Feature-based architecture, modular design
- **Real-time**: Socket.io cho tính năng real-time
- **Type Safety**: TypeScript cho code quality và maintainability
