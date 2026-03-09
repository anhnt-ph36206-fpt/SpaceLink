<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_id',
        'sku',
        'price',
        'sale_price',
        'quantity',
        'image',
        'is_active',
    ];

    protected $casts = [
        'price'      => 'decimal:2',
        'sale_price' => 'decimal:2',
        'is_active'  => 'boolean',
        'quantity'   => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /** Attributes gắn với variant này (many-to-many qua pivot) */
    public function attributes()
    {
        return $this->belongsToMany(
            Attribute::class,
            'product_variant_attributes',
            'variant_id',
            'attribute_id'
        );
    }

    /** Các mục trong giỏ hàng chứa variant này */
    public function cartItems()
    {
        return $this->hasMany(Cart::class, 'variant_id');
    }

    /** Các mục trong đơn hàng chứa variant này */
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'variant_id');
    }
}
