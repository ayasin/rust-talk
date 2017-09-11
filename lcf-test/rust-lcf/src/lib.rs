use std::thread;
use std::sync::Arc;
use std::sync::atomic::{ AtomicUsize, Ordering };

static NTHREADS: i64 = 4;

#[no_mangle]
pub extern fn lcf(n1: i64, n2: i64) -> i64 {
  let stop = if n1 < n2 { n1 + 1 } else { n2 + 1 };
  for check in 2..stop {
    if (n1 % check == 0) && (n2 % check == 0) {
      return check;
    }
  }
  0
}

fn single_lcf_thread(n1: i64, n2: i64, start: i64, step: i64, found: Arc<AtomicUsize>) {
  let mut check = start;
  let stop = if n1 < n2 { n1 + 1 } else { n2 + 1 };
  while check < stop {
    if (n1 % check == 0) && (n2 % check == 0){
      found.store(check as usize, Ordering::Relaxed);
    }
    if found.load(Ordering::Relaxed) != 0 { return; }
    check += step;
  }
}

#[no_mangle]
pub extern fn mt_lcf(n1: i64, n2: i64, found: extern fn(i64)) {
  let found_value = Arc::new(AtomicUsize::new(0));
  let mut children = vec![];
  for t_number in 0..NTHREADS {
    let local_found = Arc::clone(&found_value);
    children.push(thread::spawn(move || {
      single_lcf_thread(n1, n2, 2 + t_number, NTHREADS, local_found);
    }));
  }
  for child in children {
    let _ = child.join();
  }
  found(found_value.load(Ordering::Relaxed) as i64);
}
