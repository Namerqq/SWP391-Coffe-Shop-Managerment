package com.example.project.ordering;
public class OrderProblem extends RuntimeException {
    public final int status;
    public OrderProblem(int status, String message) { super(message); this.status = status; }
}
