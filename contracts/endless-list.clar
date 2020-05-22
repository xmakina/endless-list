(define-map items-map 
    ((page int)) 
    (
        (items (list 10 int))
        (next int)
    )
)
(define-data-var current-list-page int -1)

(define-read-only (get-current-page)
    (ok (var-get current-list-page))
)

(define-read-only (get-current-list)
    (ok (unwrap-panic (get items (get-items-map (var-get current-list-page)))))
)

(define-read-only (get-items-map-at-page (page int))
    (ok (unwrap-panic (get-items-map page)))
)

(define-public (add-item (item int))
    (if
        (has-room (var-get current-list-page))
        (ok (add-to-list (var-get current-list-page) item))
        (ok (move-to-next-list item))
    )
)

(define-private (add-to-list (page int) (item int))
    (map-set items-map 
        ((page page))
        (
            (items (add-to-length-list page item 10))
            (next (+ page 1))
        )
    )
)

(define-private (get-items-map (page int))
    (map-get? items-map ((page page)))
)

(define-private (add-to-length-list (page int) (item int) (list-length int))
    (unwrap-panic (as-max-len? (add-to-items page item) u10))
)

(define-private (add-to-items (page int) (item int))
    (concat (get items (unwrap-panic (get-items-map page))) (list item))
)

(define-private (has-room (page int))
    (and
        (map-exists-at page)
        (less-than-ten-items-in-list-at page)
    )
)

(define-private (map-exists-at (page int))
    (is-some (get items (get-items-map page)))
)

(define-private (less-than-ten-items-in-list-at (page int))
    (> u10 (len (unwrap-panic (get items (get-items-map page)))))
)

(define-private (move-to-next-list (starting-value int))
    (begin
        (var-set current-list-page (+ (var-get current-list-page) 1))
        (map-set items-map 
            (
                (page (var-get current-list-page))
            )
            (
                (items (unwrap-panic (as-max-len? (list starting-value) u10)))
                (next (+ (var-get current-list-page) 1))
            )
        )
    )
)
