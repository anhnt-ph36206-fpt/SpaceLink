<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Product extends Model
{
    use SoftDeletes, Searchable;

    protected $fillable = [
        'category_id',
        'brand_id',
        'name',
        'slug',
        'sku',
        'description',
        'content',
        'price',
        'sale_price',
        'quantity',
        'sold_count',
        'view_count',
        'is_featured',
        'is_active',
        'meta_title',
        'meta_description',
        'sale_end',
    ];

    protected $casts = [
        'price'       => 'decimal:2',
        'sale_price'  => 'decimal:2',
        'is_featured' => 'boolean',
        'is_active'   => 'boolean',
        'sale_end'    => 'datetime',
    ];

    /**
     * Relationships
     */

    // Product belongs to category
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    // Product belongs to brand
    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    // Product has many images
    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    // Product has many variants
    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    // Product has many views
    public function views()
    {
        return $this->hasMany(ProductView::class);
    }

    // Product has many reviews
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    // Product has many comments
    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    // Product in many wishlists
    public function wishlists()
    {
        return $this->hasMany(Wishlist::class);
    }

    // Product in many cart items
    public function cartItems()
    {
        return $this->hasMany(Cart::class);
    }

    // Product in promotions
    public function promotions()
    {
        return $this->belongsToMany(Promotion::class, 'promotion_products')
            ->withPivot('discount_percent', 'discount_amount')
            ->withTimestamps();
    }
    // Product has specific vouchers
    public function vouchers()
    {
        return $this->hasMany(Voucher::class);
    }
    // Product has many order items
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Scout: fields được tìm kiếm (database driver dùng LIKE trên các cột này)
     */
    public function toSearchableArray(): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'sku'         => $this->sku,
            'description' => $this->description,
            'category_id' => $this->category_id,
            'brand_id'    => $this->brand_id,
            'is_active'   => $this->is_active,
        ];
    }
}
