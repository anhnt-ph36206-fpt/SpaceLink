<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    // --- 1. KHAI BÁO HẰNG SỐ (CONSTANTS) ---
    const ROLE_ADMIN = 1;
    const ROLE_STAFF = 2;
    const ROLE_CUSTOMER = 3;

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_BANNED = 'banned';

    protected $fillable = [
        'fullname',
        'email',
        'password',
        'phone',
        'avatar',
        'date_of_birth',
        'gender',
        'role_id',
        'status',
        'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'date_of_birth'     => 'date',
        'last_login_at'     => 'datetime',
    ];

    /**
     * Relationships
     */

    // User belongs to role
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    // User has many addresses
    public function addresses()
    {
        return $this->hasMany(UserAddress::class);
    }

    // User has many orders
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    // User has many cart items
    public function cartItems()
    {
        return $this->hasMany(Cart::class);
    }

    // User has many wishlists
    public function wishlists()
    {
        return $this->hasMany(Wishlist::class);
    }

    // User has many reviews
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    // User has many comments
    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    // User has many notifications
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    // User authored news
    public function newsArticles()
    {
        return $this->hasMany(News::class, 'author_id');
    }
}
