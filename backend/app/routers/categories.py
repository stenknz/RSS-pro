from typing import List

from fastapi import APIRouter, Depends, HTTPException
from app.database import get_connection
from app.models import CategoryCreate, CategoryUpdate, CategoryOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/categories", tags=["categories"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[CategoryOut])
async def list_categories():
    conn = get_connection()
    rows = conn.execute("""
        SELECT c.*, COUNT(f.id) as feed_count
        FROM categories c
        LEFT JOIN feeds f ON f.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(body: CategoryCreate):
    conn = get_connection()
    try:
        cur = conn.execute("INSERT INTO categories (name) VALUES (?)", (body.name.strip(),))
        conn.commit()
        row = conn.execute("""
            SELECT c.*, COUNT(f.id) as feed_count
            FROM categories c
            LEFT JOIN feeds f ON f.category_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
        """, (cur.lastrowid,)).fetchone()
        conn.close()
        return dict(row)
    except Exception as e:
        conn.close()
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Category already exists")
        raise HTTPException(400, "Failed to create category")


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(category_id: int, body: CategoryUpdate):
    conn = get_connection()
    try:
        conn.execute("UPDATE categories SET name = ? WHERE id = ?", (body.name.strip(), category_id))
        conn.commit()
        row = conn.execute("""
            SELECT c.*, COUNT(f.id) as feed_count
            FROM categories c
            LEFT JOIN feeds f ON f.category_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
        """, (category_id,)).fetchone()
        conn.close()
        if not row:
            raise HTTPException(404, "Category not found")
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.close()
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Category name already exists")
        raise HTTPException(400, "Failed to update category")


@router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()
