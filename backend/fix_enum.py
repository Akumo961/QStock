from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres@localhost:3016/qr_inventory")

with engine.connect() as conn:
    # Check item 12 first
    result = conn.execute(text("SELECT id, status FROM items WHERE id = 12"))
    item = result.first()
    if item:
        print(f"Item 12 current status: '{item[1]}'")
    
    # Fix the uppercase status
    result = conn.execute(text("UPDATE items SET status = 'available'::itemstatus WHERE status::text = 'AVAILABLE'"))
    conn.commit()
    print(f"Fixed {result.rowcount} item(s)")
    
    # Check item 12 again
    result = conn.execute(text("SELECT id, status FROM items WHERE id = 12"))
    item = result.first()
    if item:
        print(f"Item 12 new status: '{item[1]}'")
    
    # Show all distinct statuses
    result = conn.execute(text("SELECT DISTINCT status FROM items"))
    print("\nAll status values in database:")
    for row in result:
        print(f"  - {row[0]}")
