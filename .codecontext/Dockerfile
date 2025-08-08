# Multi-stage Dockerfile for CodeContext Pro execution environments
FROM node:18-alpine as node-env
RUN npm install -g typescript ts-node

FROM python:3.11-alpine as python-env
RUN pip install --no-cache-dir pytest requests numpy

FROM golang:1.20-alpine as go-env
RUN apk add --no-cache git

FROM rust:1.70-alpine as rust-env
RUN apk add --no-cache musl-dev

# Final execution environment
FROM alpine:latest
RUN apk add --no-cache nodejs npm python3 py3-pip go rust cargo
WORKDIR /workspace
CMD ["sh"]
