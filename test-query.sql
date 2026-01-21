SELECT 'ticket' as source, t.id, t.title, DATE(t.due_date) as scheduled_date 
FROM Tickets t WHERE t.due_date IS NOT NULL;
