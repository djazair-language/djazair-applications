// notifications.js - Robust reminder and notification system

window.NotificationService = {
    intervalId: null,
    
    // Starts the background service to check for reminders
    start(getAllTasksCallback) {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        // Check every 10 seconds to ensure we don't miss the minute,
        // but use logic to prevent duplicate notifications within the same minute.
        this.intervalId = setInterval(() => {
            const allTasks = getAllTasksCallback();
            if (!allTasks || allTasks.length === 0) return;
            
            let now = new Date();
            let currentHM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            
            allTasks.forEach(task => {
                // Only notify if task is not completed, has a reminder, and the time matches current time HH:MM
                if (task.status === 0 && task.reminder_time && task.reminder_time === currentHM) {
                    // Check if we already notified for this task during this minute
                    if (!task._notified) {
                        window.api.notify('Reminder', task.title);
                        // Mark as notified so it doesn't trigger again in the next 10 seconds check
                        task._notified = true;
                    }
                } else if (task.reminder_time !== currentHM) {
                    // Reset the notified flag once the minute passes
                    // so it can trigger again tomorrow at the same time if not completed
                    task._notified = false;
                }
            });
        }, 10000);
    },
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
};
