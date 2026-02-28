<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'parent_id',
        'name',
        'slug',
        'image',
        'icon',
        'description',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Relationships
     */

    // Category has many products
    public function products()
    {
        return $this->hasMany(Product::class);
    }

    // Self-reference: parent category
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    // Self-reference: child categories
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
}