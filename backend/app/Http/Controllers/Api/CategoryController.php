<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Http\Resources\CategoryResource;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Category::where('is_active', true)
            ->orderBy('display_order', 'asc');

        // If tree structure is requested or default
        if ($request->input('type') === 'tree') {
            $query->whereNull('parent_id')->with('children');
        }

        $categories = $query->get();

        return CategoryResource::collection($categories);
    }
}
