FROM freeradius/freeradius-server:latest

# Install PostgreSQL client for rlm_sql
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq-dev \
    freeradius-postgresql && \
    rm -rf /var/lib/apt/lists/*

# Copy custom configuration files
COPY config/ /etc/freeradius/

# Enable SQL module and default site
RUN ln -sf /etc/freeradius/mods-available/sql /etc/freeradius/mods-enabled/sql && \
    ln -sf /etc/freeradius/sites-available/default /etc/freeradius/sites-enabled/default && \
    chown -R freerad:freerad /etc/freeradius

USER freerad

EXPOSE 1812/udp 1813/udp 3799/udp

CMD ["freeradius", "-f", "-l", "stdout"]
